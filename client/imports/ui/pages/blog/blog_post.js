import "./blog_post.less";
import "./blog_post.html";
import moment from "moment";

Template.blog_post.events({
  "click #upvote": function(e,tpl){
    $("#upvote").addClass("animate");
    setTimeout(function(){$("#upvote").removeClass("animate")},500);
    Meteor.call("upvote",{id: parseInt(tpl.data.id)});
  }
})
Template.blog_post.helpers({
  created_date(){
    return moment(this.created_date).format("MMM D");
  },
  upvotes(){
    return upvotes.findOne().upvotes
  },
  shareLink() {
    return window.location.href
  }
});

fbs_click = function() {
  u=location.href;
  t=document.title;
  window.open('http://www.facebook.com/sharer.php?u='+encodeURIComponent(u)+'&t='+encodeURIComponent(t),'sharer','toolbar=0,status=0,width=626,height=436');
  return false;
}


