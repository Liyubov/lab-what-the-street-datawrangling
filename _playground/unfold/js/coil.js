var coil = (function() {
  //Properties
  var coil = {
    curveRadius: 5,
    width: 600 - 10,
    padding: [0, 0]
  }

  function setProperties(width, curveRadius, padding){
    coil.curveRadius = curveRadius;
    coil.width = width - curveRadius * 2;
    coil.padding = padding;
  }

  //Returns svg code of coil
  function getSvgCode(coordinateStreets, gapSize){
    updateProperties();

    margin = {
      top: 0,
      left: 0
    }

    margin.top += coil.padding[0]/2;
    margin.left += coil.padding[1]/2;

    var distanceCounter = 0;
    var arrayOfSvgPieces = [];
    var svgHeight;
    var svgWidth = coil.width + coil.curveRadius*2 + margin.left + coil.padding[1];

    for (var i = 0; i < coordinateStreets.length; i++) {
      var street = coordinateStreets[i];
      arrayOfSvgPieces.push('<path stroke="#4990E2" stroke-width="1" fill="none" d="');
      for (var j = 0; j < street.length; j++) {
        var point = street[j];

        var distance = point.x;
        distanceCounter += distance;
        var bumpHeight = point.y;

        var cursor = getPositionOnCoil( distanceCounter );

        var dx = Math.sin(cursor.angle) * bumpHeight;
        var dy = Math.cos(cursor.angle) * bumpHeight;
        
        var x = cursor.x + margin.left - dx;
        var y = cursor.y + margin.top - dy;

        svgHeight = y;
        if (j==0) {
          arrayOfSvgPieces.push('M' + x + ',' + y + ' ');
        }else{
          arrayOfSvgPieces.push('L' + x + ',' + y + ' ');
        }
      };
      arrayOfSvgPieces.push('"/>');
      distanceCounter += gapSize;
    };

    svgHeight += margin.top;
    svgHeight += coil.padding[0];

    arrayOfSvgPieces.push('" />');
    arrayOfSvgPieces.push('</svg>');

    arrayOfSvgPieces.unshift('<svg width="' + svgWidth + 'px" height="' + svgHeight +'px"  viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '">');

    var svgCode = arrayOfSvgPieces.join("");
    return svgCode;
  }


  function updateProperties(){
    var curveCircumference = (2 * coil.curveRadius * Math.PI);
    var curveLength = curveCircumference/2;
    coil.curveCircumference = curveCircumference;
    coil.curveLength = curveLength;
  }


  function getPositionOnCoil(position){
    var coilSegmentLength = 2 * coil.width + 2 * coil.curveLength; //width, curve down, width, curve down
    var segmentNumber = Math.floor(position / coilSegmentLength);
    var modulo = position % coilSegmentLength;
    var part;
    var partPosition;
    var pivot;
    if (modulo < coil.width * 1 + coil.curveLength * 0) {
      part = 0;
      partPosition = modulo;
      pivot = 0;
    }else if(modulo < coil.width * 1 + coil.curveLength * 1){
      part = 1;
      partPosition = modulo - coil.width;
      pivot = 1;
    }else if(modulo < coil.width * 2 + coil.curveLength * 1){
      part = 2;
      partPosition = modulo - coil.width - coil.curveLength;
      pivot = 1;
    }else if(modulo < coil.width * 2 + coil.curveLength * 2){
      part = 3;
      partPosition = modulo - coil.width * 2 - coil.curveLength;
      pivot = 2;
    }else{
      console.log('this should not happen');
    }

    var x;
    var y;
    var angle;
    var angleOutput;

    switch(part){
      case 0:
        x = partPosition + coil.curveRadius;
        y = pivot * coil.curveRadius * 2;
        angleOutput = toRadians(0);
        break;

      case 1:
        x = partPosition + coil.curveRadius;
        y = pivot * coil.curveRadius * 2;
        var completionPercentage = partPosition / coil.curveLength;
        angle = toRadians(180 - completionPercentage * 180);
        var dx = Math.sin(angle) * coil.curveRadius;
        var dy = Math.cos(angle) * coil.curveRadius;
        x = dx + coil.width + coil.curveRadius;
        y = pivot * coil.curveRadius + dy;
        angleOutput = toRadians(completionPercentage * 180);
        break;
      case 2:
        x = (coil.width - partPosition) + coil.curveRadius;
        y = pivot * coil.curveRadius * 2;
        angleOutput = toRadians(180);
        break;

      case 3:
        var completionPercentage = partPosition / coil.curveLength;
        angle = - toRadians(180 - completionPercentage * 180);
        var dx = Math.sin(angle) * coil.curveRadius;
        var dy = Math.cos(angle) * coil.curveRadius;
        x = dx + coil.curveRadius;
        y = pivot * coil.curveRadius + dy + coil.curveRadius;
        angleOutput = toRadians(completionPercentage * 180 - 180);
        break;
    }

    var segmentTop = segmentNumber * coil.curveRadius * 4;
    var output = {
      x: x,
      y: y + segmentTop,
      angle: angleOutput
    }

    return output;
  }

  // Convert degrees to radians
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function getDistanceInPixels(meter, meterPerPixel){
    return meter * 2 / meterPerPixel; //e.g. you have 2 meters distance, and one pixel equals 4 meters, than it returns 0.5 pixel
  }

  return {
    getPositionOnCoil : getPositionOnCoil,
    setProperties : setProperties,
    getSvgCode : getSvgCode
  }

})()