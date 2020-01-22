highlight = function(div, delay)
{
	$(div).addClass("highlight");
	if(delay)
		setTimeout(function(){$(div).removeClass("highlight")},delay);
}

isEmpty = (v) => {
 if(v === null || v === undefined || v === "" || v.length === 0) return true;

 if(typeof parseFloat(v) === "number") {
   return parseFloat(v) === 0
 }

 if(isNaN(v)) return _.isEmpty(v);
 return false;
}

toTime = (s) => {
  let mins = Math.floor(s / 60)
  let secs = Math.floor(s % 60)
  return padZeros(mins) + ":" + padZeros(secs)
}

imageReader = function(file, callback) {
  var reader = new FileReader();

  reader.onload = function(e) {
    var maxSize = 2000000 // 2 MB
    var image = new Image()
    image.src = e.target.result

    image.onload = function() {
      if(e.target.result.indexOf('data:image') === -1 || file.size > maxSize)
        return callback({success: false, response: (file.size > maxSize ? "Maximum image size allowed (1Mb)" : "Image format is incorrect")})

      return callback({success: true, response: e.target.result.split(',')[1]})
    }
    image.onerror = function() {
      return callback({success: false, response: "Image format is incorrect"})
    }
  }

  if(!file) return callback({success: false, response: "No image provided"})
  reader.readAsDataURL(file);
}