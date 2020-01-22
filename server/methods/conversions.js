Meteor.methods({

  createConversion(p) {

    _check(p.user_uuid, uuidCheck, "Invalid user");
    _check(p.input_code, CodeCheck, "Invalid input code");
    _check(p.output_code, CodeCheck, "Invalid output code");
    _check(p.input_amount, InputAmountCheck, "Invalid amount");
    _check(p.is_precise, Boolean, "Invalid type");

    // Basic logic check on the type
    if(p.input_code == p.output_code)
      throw new Meteor.Error("error", "Conversion not allowed");

    // Based on input & output codes, generate type_id
    let type_id = getCoversionTypeId(p.input_code, p.output_code);

    /*if(type_id > 1)
      throw new Meteor.Error("error", "Not supported yet");*/
  
    // Check based on type_id
    switch (type_id) {
      case 1:
      case 4:
        // Bank account
        if(p.bank) 
        {
          check(p.bank, {
            country_code: CountryCodeCheck,
            bsb: Match.Optional(BsbCheck),
            number: NonEmptyStringCheck,
            account_name: NonEmptyStringCheck,
            description: Match.Optional(NonEmptyStringCheck)
          });
        } 
          else if(p.bpay) 
        {
          // BPAY (AU)
          check(p.bpay, {
            bpay_biller_code: BpayBillerCodeCheck,
            bpay_reference: BpayReferenceCheck
          });
          p.bpay.country_code = "AU";

        } 
          else if(p.payid) 
        {
          // PAYID (AU)
          check(p.payid, {
            payid_type: PayIDTypeCheck,
            payid: NonEmptyStringCheck
          });
          p.payid.country_code = "AU";
          
        } else {
          throw new Meteor.Error("error", "Invalid conversion");
        }
      break;
      case 2:
      case 3:
        check(p.crypto, {
          output_address: NonEmptyStringCheck,
          refund_address: Match.Optional(NonEmptyStringCheck)
        });

        let checkOutputCode = ERC20_TOKENS.indexOf(p.output_code) > -1 ? "ETH" : p.output_code;
        if(!addressValidator(p.crypto.output_address, checkOutputCode)) {
          throw new Meteor.Error("error", "Invalid wallet address");
        }

        if(p.crypto.refund_address) {
          let checkRefundCode = ERC20_TOKENS.indexOf(p.input_code) > -1 ? "ETH" : p.input_code;
          if(!addressValidator(p.crypto.refund_address, checkRefundCode)) {
            throw new Meteor.Error("error", "Invalid refund address");
          }
        }
      break;
    }

    // Check if input/output is allowed
    let q_cryptos = queryLiveDb(
      `SELECT crypto_code, buy_disabled, sell_disabled, is_disabled FROM cryptos WHERE crypto_code IN (?,?)`, 
      [p.input_code, p.output_code]
    );

    _.each(q_cryptos, c => {
      if(c.is_disabled || (c.buy_disabled && p.output_code == c.crypto_code) || (c.sell_disabled && p.input_code == c.crypto_code))
        throw new Meteor.Error("error", "Sorry, you can't trade "+ c.crypto_code +" at this time.");
    });


    // Get user ip address (not available if called from api)
    let ip = null;
    if(this.connection) {
      ip = this.connection.clientAddress;
      // Check if limit not reached
      let limitQuery = queryLiveDb(`SELECT id FROM conversions WHERE status_id = 1 AND ip = ?`, [ip]);
      if(limitQuery && limitQuery.length >= MAXIMUM_PENDING_CONVERSIONS_LIMIT)
      {
        throw new Meteor.Error("failure", "You have reached a limit. Please complete outstanding conversions first or cancel them.");
      }
    }

    // Get user
    let user_id;
    if(this.userId) {
      // Logged in
      user_id = parseInt(this.userId);
    } else {
      // Logged off (get user)
      let user = getUser(p.user_uuid);
      if(user) {
        // User found
        user_id = user.id;
      } else {
        // Not found, create a new one..
        let q = queryLiveDb(
          "INSERT INTO users (uuid, session_ip) VALUES (?,?)",
          [p.user_uuid, ip || ""]
        );
        user_id = q.insertId;
      }
    }

    // Begin transaction
    let dbSync = new DBSyncWrapper();
    try
    {
      dbSync.beginTransaction();
      // Setup basic params
      let conversion_uuid = uuid.new();
      let input_info_id, output_info_id;
      let description = p.bank ? (p.bank.description || null) : null;
      let refund_address = p.crypto ? (p.crypto.refund_address || null) : null;
      // Unique tag (required for XRP)
      let tag = p.input_code === "XRP" ? parseInt(Math.random() * 99999999) : null;

      // 1) Generate crypto input info id
      if([1,2].indexOf(type_id) > -1)
      {
        // Create input info id, crypto address derived from inserted wallet info row
        let q = dbSync.execute(`INSERT INTO wallet_info (crypto_code, is_owned, updated) VALUES(?,1,NOW())`, [p.input_code]);
        input_info_id = q.insertId;
        let crypto_address = createCryptoAddress({id: input_info_id, crypto_code: p.input_code});
        dbSync.execute(`UPDATE wallet_info SET crypto_address = ? WHERE id = ?`, [crypto_address, input_info_id]);
      }
        else
      {
        // Use FastX cc payment form
        input_info_id = null;
      }

      // 2) Generate output info id
      if([1,4].indexOf(type_id) > -1)
      {
        // a) fiat output
        // TODO: make more modular
        output_info_id = p.bank ? findBankInfo(p.bank) : (p.bpay ? findBankInfoByBpay(p.bpay) : findBankInfoByPayId(p.payid));
        if(!output_info_id) {
          output_info_id = createBankInfo(p.bank || p.bpay || p.payid);
        }
      } else {
        // b) crypto output
        // check crypto address exist already
        let check = dbSync.execute(
          `SELECT id FROM wallet_info WHERE crypto_code = ? AND crypto_address = ?`,
          [p.output_code, p.crypto.output_address]
        );
        if(check.length > 0) {
          // Use existing
          output_info_id = check[0].id;
        } else {
          // Create new
          let q = dbSync.execute(
            `INSERT INTO wallet_info (crypto_code, crypto_address, is_owned, updated) VALUES(?,?,0,NOW())`,
            [p.output_code, p.crypto.output_address]
          );
          output_info_id = q.insertId;
        }
      }

      // Get the rate between input/output & input/AUD
      let cryptoQuery = dbSync.execute(
        `SELECT rate, code_from, code_to FROM conversion_rates 
          WHERE code_from = ? AND (code_to = ? OR code_to = 'AUD')`,
        [p.input_code, p.output_code]
      );

      if(!cryptoQuery.length)
        throw new Meteor.Error("error", "Conversion rate not found");

      /// If any outdated price found..
      let outdatedPriceQuery = dbSync.execute(
        `SELECT code_from, code_to, datetime
          FROM exchange_rates WHERE (code_from = ? OR code_from = ?) 
        AND datetime < NOW() - INTERVAL ? HOUR`, 
        [p.input_code, p.output_code, SETTINGS.outdated_price_hours]
      );
      if(outdatedPriceQuery.length) {
        // Fail conversion and notify admin
        emailNotifyAdmin("Conversion rate is outdated: "+JSON.stringify(p, null, 2));
        throw new Meteor.Error("error", "Conversion rate is outdated");
      }
      
      let input_amount = p.input_amount;
      // Fix decimal for fiat input
      if([3,4].indexOf(type_id) > -1) input_amount = parseFloat(input_amount.toFixed(2));

      // Calculate output amount
      let rate = cryptoQuery.find(c => c.code_to === p.output_code).rate;
      let output_amount = Math.round(input_amount * rate * 100000) / 100000;
      // Fix decimal for fiat output
      if([1,4].indexOf(type_id) > -1) output_amount = parseFloat(output_amount.toFixed(2));

      // Calculate amounts
      let to_aud = cryptoQuery.find(c => c.code_to === "AUD");
      // If can't find to AUD pair, means we are converting f/c or f/f
      if(!to_aud) to_aud = {rate: 1}; // Keep rate 1:1

      let min_amount_allowed = parseFloat((SETTINGS.min_conversion_amount_aud_equivalent / to_aud.rate).toFixed([3,4].indexOf(type_id) > -1 ? 2 : 8)); 
      let max_amount_allowed = parseFloat((SETTINGS.max_conversion_amount_aud_equivalent / to_aud.rate).toFixed([3,4].indexOf(type_id) > -1 ? 2 : 8));
      
      // Min input amount check
      if(min_amount_allowed > input_amount)
        throw new Meteor.Error("error", "Input amount too small, minimum amount allowed is "+min_amount_allowed+" "+p.input_code);
      // Max input amount check
      if(max_amount_allowed < input_amount) 
        throw new Meteor.Error("error", "Input amount too large, maximum amount allowed is "+max_amount_allowed+" "+p.input_code);

      // Finally, insert new conversion
      let q = dbSync.execute(
        `INSERT INTO conversions
          (
            uuid, tag, user_id, input_code, input_amount, input_info_id, output_code,
            output_amount, output_info_id, type_id, is_precise, refund_address, description, ip, datetime
          )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [
          conversion_uuid,
          tag,
          user_id,
          p.input_code,
          input_amount,
          input_info_id,
          p.output_code,
          output_amount,
          output_info_id,
          type_id,
          p.is_precise ? 1 : 0,
          refund_address,
          description,
          ip
        ]
      );

      dbSync.commitrelease();

      return {
        success: true,
        uuid: conversion_uuid
      }
    }
    catch(e)
    {
      dbSync.rollbackrelease();
      console.log(e);
      throw new Meteor.Error("Error", e.reason ? e.reason : "Oops, conversion creation failed.");
    }
  },

  changeConversionType(p) {
    check(p, {
      user_uuid: uuidCheck,
      conversion_uuid: uuidCheck,
      is_precise: Boolean
    });
    
    // Begin transaction
    let dbSync = new DBSyncWrapper();
    try
    {
      dbSync.beginTransaction();
      
      let q = dbSync.execute(
        `UPDATE conversions c, 
          (SELECT u.id FROM users u WHERE u.uuid = ?) src 
        SET is_precise = ? 
          WHERE c.uuid = ? AND c.user_id = src.id AND status_id = 1`, 
        [p.user_uuid, p.is_precise ? 1 : 0, p.conversion_uuid]
      );

      // Stop, if update was not triggered
      if(q.affectedRows === 0) {
        dbSync.commitrelease();
        return;
      }

      if(!p.is_precise) 
      {
        // Update input & output amounts if changing to "quick"
        // so that stuck conversion becomes unstuck
        let conversion = activeConversions.findOne({uuid: p.conversion_uuid, status_id: 1});
        let amount = conversion.pending_balance;
        
        if(amount > 0) {
          dbSync.execute(
            `UPDATE conversions SET input_amount = ?, output_amount = ? WHERE id = ?`, 
            [amount, toDecimalByTypeId(amount * conversion.rate, conversion.type_id), conversion.id]
          );
        }
      }

      dbSync.commitrelease();
      return "OK";
    } 
      catch(e) 
    {
      dbSync.rollbackrelease();
      console.log(e)
      throw new Meteor.Error("Error", e.reason ? e.reason : "Oops, something wrong happened.");
    }
  }
});
