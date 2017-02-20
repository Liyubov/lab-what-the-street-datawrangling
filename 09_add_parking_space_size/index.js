var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var async = require('async');
var xml2js = require('xml2js');
var mongodb = require('mongodb');

var parser = new xml2js.Parser();
var builder = new xml2js.Builder({ headless: true });
var MongoClient = mongodb.MongoClient;

var mongoUrlRaw;

var defaultPrecision = 2;
var precision;
var parkingSpaceAreaCounter = 0;
var parkingSpaceCounter = 0;
var notFound = [];
var defaultNumberOfBikeParking = 2; // when no capacity is given

main();

function main() {
    if (argv.mongodb && argv.svg) {
        var mongoUrl = argv.mongodb;
        mongoUrlRaw = mongoUrl.replace('_derived', '_raw');
        precision = argv.precision || defaultPrecision;
        console.log();
        console.log('   1. Connecting to mongodb (' + mongoUrl + ')');
        MongoClient.connect(mongoUrl, function(err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('      Done');
                svgPath = argv.svg;
                alteringSvg(svgPath, db);
            }
        });
    } else {
        printInstructions();
    }
}

function stdout(str) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(str);
}

function alteringSvg(svgFile, db) {
    console.log();
    console.log('   2. Svg file (' + svgFile + ')');
    stdout('      Reading ...');
    fs.readFile(svgFile, function(err, data) {
        stdout('      Parsing ...');
        parser.parseString(data, function(err, result) {
            if (err) {
                console.log(err);
            } else {
                stdout('      Iterating over polygons');
                var output = result;
                var polygons = result.svg.polygon;
                //var newPolygons = [];

                async.eachSeries(polygons, function iteratee(polygon, callback) {
                        parkingSpaceCounter++;

                        polygonContent = polygon.$;
                        var id = polygonContent.id;
                        stdout('      Querying Parking Space with Id ' + id);

                        var collection = db.collection('ways');
                        collection.findOne({ _id: parseInt(id) }, function(err, document) {
                            if (err) {
                                console.log(err);
                                //newPolygons.push(polygonContent);
                                setImmediate(callback);
                            } else if (document === null) {
                                // The parking spaces Michael added when no defined shape was present e.g. http://www.openstreetmap.org/node/2054127664
                                stdoutappend(' - bike parking without geometry');
                                MongoClient.connect(mongoUrlRaw, function(err, db2) {
                                    if (err) {
                                        console.log('Unable to connect to the mongoDB server. Error:', err);
                                    } else {
                                        var collection2 = db2.collection('nodes');
                                        collection2.findOne({ _id: parseInt(id) }, function(err, document) {
                                            if (err) {
                                                console.log(err);
                                            }

                                            if (document === null) {
                                                notFound.push(id);
                                            } else {
                                                if (document.tags && document.tags.capacity && document.tags.capacity.capacity) {
                                                    if (isNaN(document.tags.capacity.capacity)) {
                                                        var area = defaultNumberOfBikeParking * 1.6;
                                                        var roundedArea = roundToDecimals(area, precision);
                                                        polygonContent.moovel_area = roundedArea;
                                                        stdoutappend(' - ' + roundedArea);
                                                    }else{
                                                        var area = document.tags.capacity.capacity*1.6; // m^2 (bikeparkw = 0.8, bikeparkh = 2)
                                                        var roundedArea = roundToDecimals(area, precision);
                                                        polygonContent.moovel_area = roundedArea;
                                                        stdoutappend(' - ' + roundedArea);
                                                    }

                                                }
                                            }

                                            // newPolygons.push(polygonContent);
                                            db2.close();
                                            setImmediate(callback);
                                        });
                                    }
                                });
                            } else {
                                if (document.properties_derived && document.properties_derived.area) {
                                    var area = document.properties_derived.area;

                                    if (isNaN(area)) {
                                        throw document
                                    }

                                    parkingSpaceAreaCounter += area;
                                    var roundedArea = roundToDecimals(area, precision);
                                    stdoutappend(' - ' + roundedArea);
                                    polygonContent.moovel_area = roundedArea;
                                }
                                // newPolygons.push(polygonContent);
                                setImmediate(callback);
                            }
                        });
                    },
                    function() {
                        stdout('      Done');
                        db.close();

                        var xml = builder.buildObject(output);
                        xml = xml.replace('<root>\n  ', '');
                        xml = xml.replace('\n</root>', '');
                        saveSvg(svgFile, xml);
                    });
            }
        });
    });
}

function stdoutappend(str) {
    process.stdout.write(str);
}

function printSummary() {
    console.log();
    console.log();
    console.log('--------------');
    console.log('   COMPLETE      ');
    console.log('--------------');
    console.log();
    if (notFound.length === 0) {
        console.log('   All Parking Spaces were found');
    } else {
        console.log('   Not found were:')
        for (var i = 0; i < notFound.length; i++) {
            console.log('      - #' + i + ' Id:' + notFound[i]);
        }
    }

    console.log();
    console.log('   Number of Parking Spaces: ' + parkingSpaceCounter);
    console.log('   Combined Area: ' + parkingSpaceAreaCounter);
    console.log();
    console.log('   IMPORTANT:');
    console.log('   Add both numbers above to the city json metadata');
    console.log();
}

function saveSvg(svgFile, xml) {
    var fileName = path.basename(svgFile);
    var exportPath = path.join('export', fileName);
    exportPath = path.join(__dirname, exportPath);

    console.log();
    console.log();
    console.log('   3. Saving svg ' + exportPath);
    fs.writeFile(exportPath, xml, function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log('      Done');
            printSummary();
        }
    });
}

function printInstructions() {
    console.log('');
    console.log('--------------');
    console.log("  HOW TO RUN  ");
    console.log('--------------');
    console.log('');
    console.log('For svg:');
    console.log("  node index.js --svg yourSvgFile.svg --mongodb mongodb://username:password@ip:port/db?authSource=admin --precision 2");
    console.log('');
    console.log("  - svg:           The svg file you want to be altered.");
    console.log("  - mongodb:       The connection to the mongoDB as url. E.g.: mongodb://username:password@ip:port/db?authSource=admin");
    console.log("  - precision:    The number of decimals the area should be copied with - defaults to " + defaultPrecision);
    console.log('');
    console.log('Exiting now!');
    console.log('');
}

function roundToDecimals(value, numberOfDecimals) {
    var divide = Math.pow(10, numberOfDecimals);
    var roundedValue = Math.round(value * divide) / divide;
    return roundedValue;
}