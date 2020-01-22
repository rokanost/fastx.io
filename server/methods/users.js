import geoip from 'geoip-lite';

Meteor.methods({

  geoLookup(ip) {
    let geo = geoip.lookup(ip || this.connection.clientAddress);
    try
    {
      const res = {
        ...geo,
        country_name: COUNTRY_CODES.find(c => c.code === geo.country).name
      };
      // Success
      return res;
    }
    catch(e)
    {
      // Failed, return default
      return {
        "range": [
          2108194816,
          2108196863
        ],
        "country": "AU",
        "region": "OC",
        "eu": "0",
        "timezone": "",
        "city": "Sydney",
        "ll": [
          -33.494,
          143.2104
        ],
        "metro": 0,
        "area": 1000,
        "country_name": "Australia"
      }
    }
  },

  login(p)
  {
    _check(p.email, EmailCheck, "Invalid email");
    _check(p.password, NonEmptyStringCheck, "Invalid password");
    _check(p.captchaData, NonEmptyStringCheck, "Captcha verification is missing");

    let verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(this.connection.clientAddress, p.captchaData);
    if (!verifyCaptchaResponse.success)
      throw new Meteor.Error("verification-error", "Captcha verification failed, please try again.");

    let session_ip = this.connection.clientAddress;

    let q = queryLiveDb(
      "SELECT id, password_hash, uuid FROM users WHERE email_verified = 1 AND email = ?",
      [p.email]
    );

    if(q && q.length > 0)
    {
      let user_id = q[0].id.toString();
      let uuid = q[0].uuid;
      let password_hash = q[0].password_hash;  //Get the password hash and check it

      if(verifycryptSHA512(p.password, password_hash))
      {
        // Create session token
        let token = Random.secret(SESSION_TOKEN_LENGTH);
          queryLiveDb(
            `UPDATE users 
              SET 
              session_ip = ?, 
              session_token = ?, 
              session_token_created_timestamp = NOW() 
            WHERE id = ?`, [
          session_ip,
          token,
          user_id
        ]);

        this.setUserId(user_id);

        return {
          uuid,
          token
        };
      }
    }
    else
      throw new Meteor.Error("login", "Invalid username/password or email not verified.");
  },

  loginWithToken(token) {
    check(token, SessionTokenCheck);
    // Check if supplied token is valid
    let q = queryLiveDb(`SELECT id, uuid FROM users WHERE session_ip = ? AND session_token = ?`, [
      this.connection.clientAddress,
      token
    ]);

    if(q && q.length > 0) {
      // Success
      let userId = q[0].id;
      // Renew user's session
      queryLiveDb(
        `UPDATE users
        SET session_token_created_timestamp = NOW()
          WHERE id = ?`,
        [userId]
      );

      this.setUserId(userId.toString());

      return {
        uuid: q[0].uuid
      }
    }
  },

  //Will send a password reset email
  sendResetPasswordEmail(email){

    _check(email, EmailCheck, "Incorrect email address");

    let verification_token  = Random.secret(VERIFICATION_TOKEN_LENGTH);  //Generate new verificaiton_token

    let q = queryLiveDb(
      "UPDATE users SET verification_token=?, verification_token_created_timestamp = NOW() WHERE email = ?",
      [
        verification_token,
        email
      ]
    );

    if(q && q.affectedRows > 0)
    {
      Meteor.defer(() => {
        let html = `You have requested a password reset,<br /><br />
        Reset your password by clicking the following link:<br />
        <a href="`+BASE_URL+`pwd_reset/`+verification_token+`" target="_blank">`+BASE_URL+`pwd_reset/`+verification_token+`</a><br/><br/>
        If this wasn't you, someone might be trying to access your account.<br />`;

        Email.send({
          to: email,
          from: FROM_ADDR,
          subject: "FastX - Password reset",
          html: emailLayout(html)
        });
      });
    }

  },

  updatePassword(p) {
    _check(p.password, PasswordCheck, "Password check failed");
    _check(p.verification_token, VerificationTokenCheck, "Verification token check failed");

    let q2 = queryLiveDb("SELECT email FROM users WHERE verification_token = ?", [p.verification_token]);
    var password_hash = sha512crypt(p.password.toString(), "$6$rounds=200000$" + generateSHA512Hash());

    //Ensure verification_token gets reset
    queryLiveDb(`UPDATE users
      SET password_hash = ?, verification_token = NULL, verification_token_created_timestamp = NULL
    WHERE verification_token = ?`,
        [
          password_hash,
          p.verification_token
        ]);

    if(q2 && q2.length>0)
    {
        return {
            email : q2[0].email
        }
    }
    else
        throw new Meteor.Error("server-errror","Could not find customer that matched verification token");

  },



  logout() {
    if(!this.userId) return;
    queryLiveDb(
      `UPDATE users 
        SET 
          session_token = null,
          session_ip = null, 
          session_token_created_timestamp = null
       WHERE id = ?`,
       [this.userId]
    );
    this.setUserId(null);
  },


  setEmailedVerified(verification_token) {

    check(verification_token, VerificationTokenCheck);

    let q = queryLiveDb(
      `SELECT id, uuid FROM users WHERE email_verified = 0 AND email_verification_token = ?`,
      [verification_token]
    );

    if(q.length > 0)
    {
      let user_id = q[0].id;
      let u_uuid = q[0].uuid;

      let session_ip = this.connection.clientAddress;
      let token = Random.secret(SESSION_TOKEN_LENGTH);

      queryLiveDb(
        `UPDATE users
          SET
            email_verified = 1,
            email_verification_token = NULL,
            session_ip = ?,
            session_token = ?,
            session_token_created_timestamp = NOW()
        WHERE id = ?`,
        [session_ip, token, user_id]
      );

      // Log user in
      this.setUserId(user_id.toString());

      let res = {
        u_uuid,
        token
      };

      // Return the last conversion this user made before signing up, so we can re-direct them to it
      let q2 = queryLiveDb("SELECT uuid FROM conversions WHERE user_id = ? ORDER BY id DESC", [user_id]);
      if(q2 && q2.length > 0) res.c_uuid = q2[0].uuid; // Conversion found

      return res;
    }

    throw new Meteor.Error("verification-error", "Could not verify email address");
  },

  createUser(p) {

    _check(p.email, EmailCheck, "Incorrect email address");
    _check(p.captchaData, NonEmptyStringCheck, "Captcha verification is missing");
    _check(p.user_uuid, uuidCheck, "Incorrect user identified");
    _check(p.password, PasswordCheck, "Invalid Password");

    let password_hash = sha512crypt(p.password.toString(), "$6$rounds=200000$" + generateSHA512Hash());
    let verification_token = Random.secret(VERIFICATION_TOKEN_LENGTH);
    let verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(this.connection.clientAddress, p.captchaData);

    if (!verifyCaptchaResponse.success)
      throw new Meteor.Error("verification-error", "Captcha verification failed, please try again.");

    // Check for unique email address and user uuid
    let userCheck = queryLiveDb("SELECT id FROM users WHERE email = ?", [p.email]);
    if(userCheck && userCheck.length > 0)
      throw new Meteor.Error("createUser", "You are already registered! Please login.");
    else
    {
      //Check if Guest exists and convert them to a new user
      userCheck = queryLiveDb("SELECT id FROM users WHERE uuid = ? AND email IS NULL", [p.user_uuid]);
      if(userCheck && userCheck.length > 0)
      {
        queryLiveDb(
          "UPDATE users SET email = ?, password_hash = ?, session_ip = ?, email_verification_token = ? WHERE uuid = ?",
          [p.email, password_hash, this.connection.clientAddress, verification_token, p.user_uuid]
        );
      }
      //Entirely new user
      else
      {
        queryLiveDb(
          "INSERT INTO users (email, password_hash, uuid, session_ip, email_verification_token) VALUES (?,?,?,?,?)",
          [p.email, password_hash, uuid.new(), this.connection.clientAddress, verification_token]
        );
      }
    }

    Meteor.defer(() => {
      let html = Spacebars.toHTML({
        BASE_URL,
        verification_token
      }, Assets.getText('email_templates/verification_email.html'));

      Email.send({
        to: p.email,
        from: FROM_ADDR,
        subject: "FastX - Email Verification Required",
        html: emailLayout(html)
      });
    });

    return "Account created";

  }

});
