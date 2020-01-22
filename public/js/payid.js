payid = {

    baseUrl: "https://fastx.io",

    init: function({checkoutFormId, payIdContainerId, token}) {
        if(checkoutFormId)
            this.checkoutFormId = checkoutFormId.replace("#", "");
   
        const iframe = document.createElement('iframe');
        iframe.src = this.baseUrl+"/payid/"+token;
        iframe.id = "payid-container";
        iframe.style = `outline: none !important;
        border: 0;
        width: 300px;
        height: 450px;`;

        document.getElementById(payIdContainerId.replace("#", "")).appendChild(iframe);
    },

    completeCheckout: function() {
        if(this.checkoutFormId) {
            document.getElementById(this.checkoutFormId).submit();
        }
    }
}