import "/client/imports/ui/styles/api.less";
import "/client/imports/ui/pages/api.html";

Template.api.onRendered(function(){
  window.prerenderReady = true;//Tell pre-render we are now ready
});

Template.api.helpers({
  required_headers: function() {
    return (this.method === "POST" ? (`Content-Type: application/json` + `\n`) : ``) + `api_key: YOUR_API_KEY`
  },
  api_docs: function(is_public) {
    return api_docs.find(is_public !== undefined ? {is_public: is_public} : {})
  }
});
