// Send notifications
/*
  0:	"Cancelled / Expired",
  1:	"Pending",
  2:	"Initial transfer detected",
  3:	"Transfer confirmed"
*/

emailConversionStatusUpdate = (id) => {
  Meteor.defer(() => {
    try 
    {
      let q = queryLiveDb(`SELECT
          c.id, c.uuid, input_code, input_amount, output_code, output_amount, email, status_id, output_sent_datetime
        FROM conversions c
          JOIN users u ON u.id = c.user_id
        WHERE c.id = ?`, [id]
      );

      if(q && q.length === 1)
      {
        let admin, customer;
        let conversion = q[0];
        // input tx confirmed 
        if(conversion.status_id === 3) 
        {
          if(!conversion.output_sent_datetime) {
            // output not released
            admin = {
              subject: "New crypto transaction! #"+conversion.id,
              html: `Admin, your action required!<br /><br />
              <u>Please verify and complete payment to:</u><br /><br />
              <pre>`+JSON.stringify(conversion, null, 2)+`</pre><br /><br />
              <a href="`+BASE_URL+`admin" target="_blank">Admin</a>`
            };
            customer = {
              subject: "Transfer confirmed",
              html: `Hey,<br />
              This is a confirmation that transfer of <b>`+conversion.input_amount+` `+conversion.input_code+`</b> was received.
              We are now processing a payment to your nominated account.`
            };
          } 
            else 
          {
            // output released (completed)
            admin = {
              subject: "Payment completed: #"+conversion.id,
              html: "Status has been updated as you have indicated a payment confirmation."
            };
            customer = {
              subject: "Payment released",
              html: `Hey,<br />
              We have sent <b>`+conversion.output_amount+` `+conversion.output_code+`</b> to your nominated account.<br/>
              Thanks for using FastX.<br />Have a nice day :)`
            };
          }

          // Notify admins through FB
          Meteor.call("sendFBMessageToAdmins", {msg: admin.subject}, (er) => {});
        }

        // Email to ADMIN
        if(admin)
        {
          Email.send({
            to: "support@fastx.io",
            from: FROM_ADDR,
            subject: admin.subject,
            html: emailLayout(admin.html)
          });
        }

        // Email to Customer
        if(customer && conversion.email)
        {
          Email.send({
            to: conversion.email,
            from: FROM_ADDR,
            subject: customer.subject,
            html: emailLayout(customer.html)
          });
        }
      }
    } catch(e) {
      console.log("ERROR: emailConversionStatusUpdate: ", e)
    }
  });
}

// Emails both user / admin notifying them of a pending verification
emailVerificationPending = (to) => {
  Meteor.defer(() => {
    // SEND ADMIN EMAIL
    Email.send({
      to: "support@fastx.io",
      from: FROM_ADDR,
      subject: "Manual Verification Required",
      html: emailLayout(`Click here to manually verify documents: <a href="`+BASE_URL+`admin">View Docs</a>`)
    });

    // SEND EMAIL TO USER
    Email.send({
      to,
      from: FROM_ADDR,
      subject: "Verification - Pending",
      html: emailLayout(`We are currently reviewing the documents that you have submitted. You will be notified by email once we have completed our verification checks.`)
    });
  });
}


emailVerificationSuccess = (to) => {
  Meteor.defer(() => {
    // SEND EMAIL TO CLIENT
    let theHtml = `Congratulations! We have verified the identification documents which you have supplied.<br/><br/>
    <a href=`+BASE_URL+`>Click here</a> to return to FastX and complete your transaction.`;
    Email.send({
      to,
      from: FROM_ADDR,
      subject: "Verification - Completed",
      html: emailLayout(theHtml)
    });
  });
}

emailRandomAmountFailure = (userId) => {
  Meteor.defer(() => {
    // SEND ADMIN EMAIL
    Email.send({
      to: "support@fastx.io",
      from: FROM_ADDR,
      subject: "Random Amount Failure",
      html: emailLayout(`User #`+userId+` has failed to confirm random amount. <a href="`+BASE_URL+`admin">Admin dashboard</a>`)
    });
  });
}

emailNotifyAdmin = (text) => {
  Meteor.defer(() => {
    Email.send({
      to: "support@fastx.io",
      from: FROM_ADDR,
      subject: "Admin Notification",
      html: emailLayout(text)
    });
  });
}