import "./payid.html";

Template.payid.onCreated(function() {
    payid_orders.find().observeChanges({
        changed(row, newRow) {
            if(newRow && newRow.status === "completed") {
                // Submit parent window form
                if(window.parent && window.parent.payid) 
                {
                    window.parent.payid.completeCheckout();
                    return;
                }
                console.error("completeCheckout: PayID not initialized");
            }
        }
    });
});

Template.payid.helpers({

    amountOutstanding: function() {
        const data = Template.instance().data
        console.log(data, Template.instance())
        return data.amount - data.amount_paid
    }
});