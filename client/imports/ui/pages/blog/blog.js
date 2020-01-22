import "./blog.less";
import "./blog.html";
import moment from "moment";

Template.blog.helpers({
    blog() {
        return blog.find().fetch()
    },
    created_date(){
        return moment(this.created_date).format("MMMM Do, YYYY");
    }
})

Template.blog_upload.events({
    "submit form"(e,tpl) {
        e.preventDefault();
        const btn = $('[type="submit"]')
        btn.button("loading");

        let params = _.reduce($(e.currentTarget).serializeArray(), (m,r) => {
            m[r.name] = r.value
            return m
        }, {});

        let file = tpl.find('[type="file"]').files[0];
        imageReader(file, (res) => {
          if(!res.success) {
            // Error
            btn.button("reset");
            return sAlert.error(res.response);
          }
          // Success, continue...
          params.image = res.response;
          Meteor.call("blogUpload", params, (er) => {
            btn.reset();
            if(er) return sAlert.error(er.reason);
            sAlert.success("Article submitted for review! Thank you.");
            $(e.currentTarget)[0].reset();
          });
        });
    }
});

