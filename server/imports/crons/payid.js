SyncedCron.add({
    name: 'refreshANZtxs',
    schedule: function(parser) {
         return parser.text('every 10 seconds');
    },
    job: function() {
        if(!!SETTINGS['maintenance'] || !SETTINGS['run_payid']) return false;

        // Check if there are any tx's pending
        let q = queryLiveDb(
            `SELECT id FROM payid_orders WHERE status != "completed"`
        );

        if(q.length > 0) {
            return Meteor.call("savePayIdTxs");
        } else {
            return true;
        }
    }
});

SyncedCron.add({
    name: 'triggerPayIDWebhooks',
    schedule: function(parser) {
         return parser.text('every 5 seconds');
    },
    job: function() {
        if(!!SETTINGS['maintenance'] || !SETTINGS['run_payid']) return false;

        // Trigger webhooks on fully paid orders
        let q = queryLiveDb(
            `SELECT 
                o.id, o.status, webhook_url, amount, 
                order_id, c.id as company_id
            FROM payid_orders o
                JOIN payid_companies c ON c.id = o.company_id
            WHERE 
                webhook_sent = 0 AND 
                webhook_retries < 3 AND 
                o.status = "completed"`
        );

        _.each(q, r => {
            try 
            {
                // If for fastx, just mark as completed manually
                if(r.company_id === 1) 
                {
                    // Update conversion status to completed
                    queryLiveDb(
                        `UPDATE conversions SET status_id = 3 WHERE id = ?`, 
                        [r.order_id]
                    );
                    // Email notification
                    emailConversionStatusUpdate(r.order_id);
                } 
                    else 
                {
                    // For other companies... do POST to their provided URL
                    HTTP.post(r.webhook_url, {
                        data: {
                            order_id: r.order_id,
                            amount: r.amount,
                            status: r.status
                        },
                        timeout: 10000
                    });
                }

                // Update DB with success
                queryLiveDb(`UPDATE payid_orders SET webhook_sent = 1 WHERE id = ?`, [r.id]);
            }
                catch(er) 
            {
                // Update DB with failure
                console.log("triggerPayIDWebhooks: ", er);
                queryLiveDb(`UPDATE payid_orders SET webhook_retries += 1 WHERE id = ?`, [r.id]);
            }
        });    
        
        return true;
    }
});

Meteor.publish("payid_orders", function(token) {
    check(token, uuidCheck);

    return LiveDb.select(
        `SELECT * FROM payid_orders WHERE token = ?`, [token],
        LiveMysqlKeySelector.Columns(["id"]),
        [
            {
                table: 'payid_orders',
                condition: (row, newRow, onDelete) => {
                    return row.token === token || (newRow && newRow.token === token)
                }
            }
        ]
    );
});


let tempANZtxs = []; // puId's
Meteor.methods({

    setupPayIdCompany(p) {
        check(p, {
            name: NonEmptyStringCheck,
            email: EmailCheck,
            payid: NonEmptyStringCheck,
            payid_type: NonEmptyStringCheck, // [mobile, email, abn/acn, orgId]
            webhook_url: NonEmptyStringCheck,
        });

        // TODO: add checks

        queryLiveDb(
            `INSERT INTO payid_companies (name, email, payid, payid_type, webhook_url, access_key, created) 
                VALUES(?,?,?,?,?,?,NOW())`, [p.name, p.email, p.payid, p.payid_type, p.webhook_url, uuid.new()]
        );

        return "OK"
    },

    generatePayIdReference(p) {
        check(p, {
            order_id: PositiveIntCheck, // Their reference
            amount: InputAmountCheck,
            access_key: uuidCheck 
        });

        let q = queryLiveDb(`SELECT id FROM payid_companies WHERE access_key = ?`, [p.access_key]);
        if(q.length) 
        {
            const company_id = q[0].id;
            // Check if not creating a duplicate
            let q2 = queryLiveDb(
                `SELECT id, token, status FROM payid_orders WHERE company_id = ? AND order_id = ?`, 
                [company_id, p.order_id]
            );

            // Duplicate found, return what's created already
            if(q2.length) 
            {
                return {
                    reference: q2[0].id,
                    token: q2[0].token,
                    status: q2[0].status
                }
            }

            // Create new if not found
            const token = uuid.new();
            const status = "pending";
            let q3 = queryLiveDb(
                `INSERT INTO payid_orders (order_id, company_id, amount, token, status, created) VALUES(?,?,?,?,?,NOW())`, 
                [p.order_id, company_id, p.amount, token, status]
            );
        
            return {
                reference: q3.insertId, // Our payID reference for customer to enter when checking out
                token,
                status  // Required to access order information inside a widget on website
            }
        }

        throw new Meteor.Error("error", "Access denied");
    },

    savePayIdTxs() 
    {
        // TODO: reoptimise sql queries
        // Check if puppet is already running
        if(!puppet.browser)
            puppet.initBrowser();

        // Check if already logged in
        if(!anz.loggedIn) 
            anz.login();
        
        // Get txs and remove those that are already in the tmp cache
        const txs = _.filter(anz.getLatestNPPTransactions(), t => tempANZtxs.indexOf(t.puId) === -1);

        // Insert into DB
        if(txs.length) 
        {
            _.each(txs, tx =>  {
                try 
                {
                    const reference = tx.reference; 
                    const amount = parseFloat(tx.amount);

                    queryLiveDb(
                        `INSERT INTO payid_txs (puId, paidTo, amount, reference, currency, created) 
                        VALUES('${tx.puId}','${tx.paidTo}','${amount}','${reference}','${tx.currency}',NOW())`
                    );

                    // Update amount paid
                    queryLiveDb(
                        `UPDATE payid_orders SET amount_paid = amount_paid + ? WHERE id = ?`, 
                        [amount, reference]
                    );
                } 
                    catch(e) 
                {
                    // Failure, most likely tried to insert a duplicate
                    //console.log("savePayIdTxs:", e);
                }
            });

            // Update statuses
            queryLiveDb(
                `UPDATE payid_orders 
                    SET status = IF(amount_paid >= amount, "completed", IF(amount_paid > 0, "partial", status))
                WHERE status != "completed" AND id IN (${Array(txs.length).fill('?')})`, 
                _.map(txs, tx => parseInt(tx.reference))
            );

            //Add to cache
            tempANZtxs.push(..._.map(txs, tx => tx.puId));
        }

        return true;
    }
})