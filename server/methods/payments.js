Meteor.methods({

  processSale(p) {

    check(p, {
      uuid: uuidCheck,
      payment_type: NonEmptyStringCheck
    });

    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    let q = queryLiveDb(
      `SELECT 
        c.id, c.uuid, input_amount, status_id, kyc_level 
        FROM conversions c
        JOIN users u ON u.id = c.user_id
       WHERE c.uuid = ? AND user_id = ? AND input_code = "AUD"`, 
      [p.uuid, this.userId]
    );

    if(q.length && q[0].status_id === 1) 
    {
      switch (p.payment_type) 
      {
        // // CreditCard with BT: disabled
        // case "braintree": {      
        //     if(q[0].kyc_level < 2)
        //       throw new Meteor.Error("access-error", "Minimum KYC level 2 is required!");

        //     let result = BraintreeSale({
        //       amount: q[0].input_amount,
        //       customerId: this.userId,
        //       options: {
        //         submitForSettlement: true
        //       }
        //     });

        //     /// SUCCESS
        //     if(result.success) 
        //     {
        //       // Update conversion status
        //       queryLiveDb(
        //         `UPDATE conversions SET status_id = 3 WHERE id = ?`, 
        //         [q[0].id]
        //       );
        //       // Email notification
        //       emailConversionStatusUpdate(q[0].id);
              
        //       return "OK";
        //     }
        //   // FAILURE
        //   throw new Meteor.Error("bt-error", result.message);
        // }

        // PayID
        case "payid": {
          // Will continue further on the client...
          return Meteor.call("generatePayIdReference", {
            order_id: q[0].id,
            amount: q[0].input_amount,
            access_key: "6106dbdc-0bbb-4372-8387-079223346085"
          });
        }
      }
    }

    throw new Meteor.Error("error", "Something went wrong..."); 
  },

  addRandomAmountCheck(paymentMethodNonce) {

    _check(paymentMethodNonce, NonEmptyStringCheck, "Missing nonce");

    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    let amount = (Math.random() + 0.10).toFixed(2) // Random amount required to verify user

    let q = queryLiveDb(
      `SELECT kyc_level, kyc_status, first_name, last_name FROM users WHERE id = ?`, 
      [this.userId]
    );

    // User must have at least KYC lvl 1
    if(q.length && q[0].kyc_level > 0 && q[0].kyc_status !== "IN_PROGRESS") 
    {
      let result = BraintreeSale({
        amount,
        paymentMethodNonce,
        options: {
          submitForSettlement: false,
          storeInVaultOnSuccess: true
        },
        customer: {
          id: this.userId,
          firstName: q[0].first_name,
          lastName: q[0].last_name
        }
      });

      /// SUCCESS
      if(result.success) 
      {
        // Update customer amount
        queryLiveDb(
          `UPDATE users SET random_amount = ?, kyc_status = "IN_PROGRESS" WHERE id = ?`, 
          [amount, this.userId]
        );
        return "OK";
      }

      throw new Meteor.Error("bt-error", result.message);
    }

    throw new Meteor.Error("error", "Something went wrong..."); 
  },

  confirmRandomAmount(amount) {
    _check(amount, InputAmountCheck, "Invalid amount");

    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    // 
    let q = queryLiveDb(
      `SELECT random_amount FROM users 
        WHERE 
          kyc_level = 1 AND 
          kyc_status = "IN_PROGRESS" AND 
          random_amount IS NOT NULL AND
          id = ?`, 
      [this.userId]
    );

    if(q.length) {
      if(Math.abs(amount - q[0].random_amount) === 0) 
      {
        // Success
        queryLiveDb(
          `UPDATE users SET random_amount = NULL, kyc_level = 2, kyc_status = "VERIFIED" WHERE id = ?`, 
          [this.userId]
        );
        return "OK";
      } 
        else 
      {
        // Failure, prevent from using this card (user needs to contact support to get verified)
        // Revert back user state to KYC 1 (verified)
        queryLiveDb(
          `UPDATE users SET random_amount = NULL, kyc_status = "FAILED" WHERE id = ?`, 
          [this.userId]
        );
        // Email admin to investigate
        emailRandomAmountFailure(this.userId);

        throw new Meteor.Error("error", "Incorrect amount entered, please contact support.");
      }
    }

    throw new Meteor.Error("error", "Something went wrong..."); 
  }
});