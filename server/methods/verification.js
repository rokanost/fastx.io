//import soap from 'soap';

// const url = '';
// const accountId = "";
// const password = "";

Meteor.methods({

  // ============== Vixverify (disabled for now) ===================
  /*registerVerification(p) {
    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    check(p, {
      first_name  : NonEmptyStringCheck,
      last_name   : NonEmptyStringCheck,
      dob         : Date,
      address_obj : AddressObjectCheck
    });

    let user_id = this.userId;

    // Allow to register your details once only
    let q = queryLiveDb(`SELECT email FROM users WHERE id = ?`, [user_id]);

    try
    {
      let params = {
        accountId,
        password,
        verificationId: user_id,
        ruleId: "default",
        name: {
          givenName: p.first_name,
          surname: p.last_name
        },
        email: q[0].email,
        currentResidentialAddress: {
          ...p.address_obj
        },
        dob: {
          day: p.dob.getDate(),
          month: p.dob.getMonth()+1,
          year: p.dob.getFullYear()
        }
      };
      let res = Promise.await(
        soap.createClientAsync(url).then(client => {
          return client.registerVerificationAsync(params)
        }).then(result => {
          return result;
        }).catch(err => {
          throw err;
        })
      );

      // Success
      let status = res[0].return.verificationResult.overallVerificationStatus;
      let addressToString = (o) => o.streetNumber+" "+o.streetName+", "+o.suburb+", "+o.state+", "+o.postcode+", "+o.country;

      // Update user
      queryLiveDb(`UPDATE users
          SET first_name = ?, last_name = ?, dob = ?, address = ?, kyc_status = ?
        WHERE id = ?`,
        [p.first_name, p.last_name, p.dob, addressToString(p.address_obj), status, user_id]
      );

      // Return list of sources
      return res[0].return.sourceList.source;

    } catch(e) {
      console.log("Error: registerVerification:", e);
      throw new Meteor.Error("error", "Invalid details supplied");
    }
  },

  getVerificationSources() {
    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    const verificationId = this.userId;
    try
    {
      let res = Promise.await(
        soap.createClientAsync(url)
        .then(client => {
          return client.getSourcesAsync({
            accountId,
            password,
            verificationId
          });
        }).then(result => {
          return result;
        }).catch(err => {
          throw err;
        })
      );

      return res[0].return.sourceList.source;

    } catch(e) {
      console.log("Error: getVerificationSources:", e);
      throw new Meteor.Error("error", "Failed to retrieve sources");
    }
  },

  getVerificationSourceFields(sourceId) {
    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    check(sourceId, NonEmptyStringCheck);

    const verificationId = this.userId;
    try
    {
      let res = Promise.await(
        soap.createClientAsync(url)
        .then(client => {
          return client.getFieldsAsync({
            accountId,
            password,
            verificationId,
            sourceId
          });
        }).then(result => {
          return result;
        }).catch(err => {
          throw err;
        })
      );

      return res[0].return.sourceFields.fieldList.sourceField;

    } catch(e) {
      console.log("Error: getVerificationSourceFields:", e);
      throw new Meteor.Error("error", "Failed to retrieve sources");
    }
  },

  setVerificationSourceFields(p) {
    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    check(p, {
      sourceId: NonEmptyStringCheck,
      inputFields: Array // TODO: proper check
    });

    let inputFields = _.reduce(p.inputFields, (m,f) => {
      m[f.name] = f.value
      return m;
    }, {});

    const verificationId = this.userId;
    console.log({
      accountId,
      password,
      verificationId,
      sourceId: p.sourceId,
      ...inputFields
    });
    try
    {
      let res = Promise.await(
        soap.createClientAsync(url)
        .then(client => {
          return client.setFieldsAsync({
            accountId,
            password,
            verificationId,
            sourceId: p.sourceId,
            ...inputFields
          });
        }).then(result => {
          return result;
        }).catch(err => {
          throw err;
        })
      );

      return res;

    } catch(e) {
      console.log("Error: setVerificationSourceFields:", e);
      throw new Meteor.Error("error", "Failed to update sources");
    }
  },*/

  // =================== Manual KYC =================
  registerManualVerification(p) {
      if(!this.userId)
        throw new Meteor.Error("access-error", "Please login");

      check(p, {
        first_name  : NonEmptyStringCheck,
        last_name   : NonEmptyStringCheck,
        dob         : Date,
        address_obj : AddressObjectCheck
      });

      let user_id = this.userId;

      // Prevents from updating if user has already began process
      let q = queryLiveDb(`SELECT id FROM users WHERE kyc_level = 0 AND kyc_status IS NULL AND id = ?`, [user_id]);
      if(q.length)
      {
        // Update user
        let addressToString = (o) => o.streetNumber+" "+o.streetName+", "+o.suburb+", "+o.state+", "+o.postcode+", "+o.country;

        queryLiveDb(`UPDATE users
            SET first_name = ?, last_name = ?, dob = ?, address = ?, kyc_status = ?
          WHERE id = ?`,
          [p.first_name, p.last_name, p.dob, addressToString(p.address_obj), "IN_PROGRESS", user_id]
        );
      }
        else
      {
        throw new Meteor.Error("update-error", "You are not allowed to change your details after you've been verified.");
      }
  },

  uploadDocuments(docs) {

    if(!this.userId)
      throw new Meteor.Error("access-error", "Please login");

    check(docs, [{
      type: DocTypeCheck,
      img: DocImgCheck
     }]);

    if(docs.length > 2) throw new Meteor.Error("access-error", "You can submit up to 2 documents");

    let q = queryLiveDb(`SELECT email, kyc_status, kyc_level FROM users WHERE id = ?`, [this.userId]);
    if(!q.length) throw new Meteor.Error("update-error", "User not found");

    if(q[0].kyc_status !== "IN_PROGRESS") {
      throw new Meteor.Error("update-error", "You can't add more documents at this time");
    }

    if(q[0].kyc_level > 0) {
      throw new Meteor.Error("update-error", "You are verified already");
    }


    Meteor.defer(() => {
      let date = new Date();
      _.each(docs, doc => {
        queryLiveDb(
          "INSERT INTO kyc_documents (user_id, type, img, datetime) VALUES(?, ?, ?, ?)",
          [
            this.userId,
            doc.type,
            CryptoJS.AES.encrypt(doc.img, IMAGE_VECTOR),
            date
          ]
        );
      });

      // TODO: add some smart API
      if(SETTINGS.autoverify_docs)
      {
        // Autoverify
        queryLiveDb("UPDATE users SET kyc_level = 1, kyc_status = 'VERIFIED' WHERE id = ?", [this.userId]);
        //emailVerificationSuccess(q[0].email);
        // Also send email for an admin to check what has been submitted
        Meteor.defer(() => {
          // SEND ADMIN EMAIL
          Email.send({
            to: "support@fastx.io",
            from: FROM_ADDR,
            subject: "Manual Verification Required",
            html: emailLayout(`Click here to manually verify documents: <a href="`+BASE_URL+`admin">View Docs</a>`)
          });
        });
      }
        else
      {
        // Update status to pending
        queryLiveDb("UPDATE users SET kyc_status = 'PENDING' WHERE id = ?", [this.userId]);
        emailVerificationPending(q[0].email);
      }

    });

    return "OK";
  },

  // Admin only
  verifyDocument(docId)
  {

    if(!isAdmin(this.userId)) throw new Meteor.Error("isAdmin","Access-denied");

    check(docId, PositiveIntCheck);

    let q = queryLiveDb(
      `SELECT
        user_id, email
      FROM kyc_documents d
        JOIN users u ON u.id = user_id
      WHERE d.id = ?`,
      [docId]
    );

    if(q.length > 0)
    {
      // Mark document as verified
      queryLiveDb("UPDATE kyc_documents SET verified = NOW() WHERE id = ?", [docId]);

      // If all documents verified, set user as KYC lvl 1
      let q2 = queryLiveDb("SELECT id FROM kyc_documents WHERE verified IS NULL AND user_id = ?", [q[0].user_id]);
      if(!q2.length)
      {
        // All docs verififed
        let q3 = queryLiveDb("UPDATE users SET kyc_level = 1, kyc_status = 'VERIFIED' WHERE kyc_level = 0 AND id = ?", [q[0].user_id]);
        if(q3.affectedRows > 0) {
          emailVerificationSuccess(q[0].email);
        }
      }
    }
  }
});