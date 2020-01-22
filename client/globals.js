VERSION  = "3.2";
GOOGLE_MAPS_API_KEY = "AIzaSyA85JOehCPloeOlUqUC0qwNi_mIYGqBnJU";//"AIzaSyAgQ8SHXVW3diPzdHl78NEWeMaHvq-G7Cs";//Meteor.settings.public.GOOGLE_MAPS_API_KEY;
BASE_URL = Meteor.absoluteUrl();

Meteor.startup(() => {

  //Load client side maps
  GoogleMaps.load({
    v: '3.31',
    key: GOOGLE_MAPS_API_KEY,
    libraries: 'geometry,places'
  });

})
