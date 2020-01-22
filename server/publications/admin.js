Meteor.publish("exchange_balances", function() {
    // Fail silently
    if(!isAdmin(this.userId)) return this.ready();

    return LiveDb.select(
        `SELECT * FROM exchange_balances`, [],
        LiveMysqlKeySelector.Columns(["exchange_name", "currency_code"]),
        [
            {
                table: 'exchange_balances',
                condition: (row, newRow, onDelete) => {
                    return true
                }
            }
        ]
    );

});

Meteor.publish("bank_balances", function() {
    // Fail silently
    if(!isAdmin(this.userId)) return this.ready();

    return LiveDb.select(
        `SELECT * FROM bank_balances`, [],
        LiveMysqlKeySelector.Columns(["bank_name", "currency_code"]),
        [
            {
                table: 'bank_balances',
                condition: (row, newRow, onDelete) => {
                    return true
                }
            }
        ]
    );

});