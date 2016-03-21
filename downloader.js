fs = require("fs");
request = require("request");
path = require("path");
url = require("url");

process.on('uncaughtException', function (err) {console.log(err);return true;});

targetedURL = "http://tjoywp.dan-fisher.com/";

targetedParseURL = url.parse(targetedURL);

targetedHostname = targetedParseURL.hostname;
targetedPathname = targetedParseURL.pathname;

// targetedPath = targetedHostname + targetedPathname;

exploreStack = {};

__threadNumber__ = 4;
__forceRelative__ = true;
__disableContraction__ = false;
__cacheDirectory__ = "new";
__forceOverwrite__ = true;

_WAITING_ = 2;
_COMPUTED_ = 1;
_FINISHED_ = 0;

downloadStarting = true;

exploreStack[targetedURL] = _WAITING_;

function ExploreURL (currentURL, callback) {
	
	//console.log("ExploreURL", currentURL);

	var currentParseURL = url.parse(currentURL);
	
	var currentHostname = currentParseURL.hostname;
	var currentPathname = currentParseURL.pathname;
	
	var currentPath = currentHostname + currentPathname;
	
	if(!(currentURL in exploreStack))
		return;
	
	callback(currentURL);
} 

function getLocation(_url) {
	
	var _parse = url.parse(_url); 
	
	var pathname = _parse.pathname;
	
	if(path.extname(pathname) == "")
		pathname += "/index.html";
	
	var _path = pathname.split('/');
	
	if(_parse.hostname != targetedHostname)
		_path.unshift(_parse.hostname);
	
	for(var i = _path.length; i--;)
		if(_path[i] === "")
			_path.splice(i, 1);
	
	if(_parse.hostname != targetedHostname)
		_path.unshift("extern");
	
	_path.unshift(__cacheDirectory__);
	
	var _pathname = "";
	var _file = _path.pop();
	
	for(var i=0;i<_path.length;i++) {
		
		_pathname += _path[i] + "/";
		
		if(!fs.existsSync(_pathname))
			fs.mkdirSync(_pathname);
		
	}
	
	_pathname += _file;
	
	return _pathname;
}

function Resolve(currentURL, location, callback) {
	
	//console.log("Resolve", currentURL);

	var currentParseURL = url.parse(currentURL);

	var currentPathname = path.dirname(currentParseURL.pathname);
	var currentHostname = currentParseURL.hostname;


	var file = fs.readFileSync(location).toString();

	if(__disableContraction__) {
		
		file = file.replace(/ src="\/\//g, ' src="http://');
		file = file.replace(/ href="\/\//g, ' href="http://');
		
		file = file.replace(/ src='\/\//g, " src='http://");
		file = file.replace(/ href='\/\//g, " href='http://");
		
	}

	var bucket = [];

	var split = file.split('http://');

	bucket.push(split[0]);

	for(var i=1;i<split.length;i++) {
		
		var sep = split[i-1][split[i-1].length-1];
		
		var matchURL = 'http://'+split[i];
		
		if(sep != "'" && sep != '"') {
					
			bucket.push("");
			bucket.push(matchURL);
		}
		else {

			var posEnd = split[i].indexOf(sep);

			bucket.push(split[i].substring(posEnd, 0));			
			bucket.push(split[i].substring(posEnd));
		}
	}

	for(var i=1;i<bucket.length;i+=2){
		
		if(bucket[i] == "")
			continue;
		
		var completeURL = "http://"+bucket[i];	
		
		var parse = url.parse(completeURL);
		

		var matchURL = "http://" + parse.hostname + parse.pathname;


		if(targetedHostname == currentHostname) { //si on est sur le domaine principale
		
			//console.log("completeURL", completeURL);			
			if(!(matchURL in exploreStack)) {
				exploreStack[matchURL] = _WAITING_;
				downloadStarting = false;
			}
			
			if(parse.hostname == currentHostname) {
				if(__forceRelative__ || currentPathname[0] != "/")
					bucket[i] = path.relative(currentPathname, parse.pathname);
				else
					bucket[i] = parse.pathname;					
			}
			else {
				bucket[i] = "/extern/" + parse.hostname + parse.pathname;
			}
		
		}
		else {
			
			if(parse.hostname == currentHostname) {
				bucket[i] = path.relative(currentPathname, parse.pathname);
			}
			else if(parse.hostname == targetedHostname) {
				
				if(__forceRelative__ || currentPathname[0] != "/")
					bucket[i] = path.relative("/extern/" + currentHostname + currentPathname, parse.pathname);
				else
					bucket[i] = parse.pathname;
			}
			else {
				bucket[i] = "/extern/" + parse.hostname + parse.pathname;
			}
			
		}
		
		//console.log(bucket[i]);

	}


	
	fs.writeFileSync(location, bucket.join(""));
	
	callback(currentURL);

	

	
};

function RequestAndResolve(URL, callback) {
	
	//console.log("RequestAndResolveBack", URL);
	
	var location = getLocation(URL);
	
	if(fs.existsSync(location) && !__forceOverwrite__) {
		
		exploreStack[location] = _FINISHED_;
		callback(URL);
		
	}
	else {
	
	var stream = fs.createWriteStream(location);
	
	stream.on('finish', function() {
			
			Resolve(URL, location, function (URL) {
				
				callback(URL);
				
			});
			
		});

	request(URL).pipe(stream).on('error', function(e){console.log("Error in pipe");});
	}
}

function Explore () {
	
	var nextURL = undefined;
	
	for(var URL in exploreStack) {
		if(exploreStack[URL] == _WAITING_) {
			nextURL = URL;
			exploreStack[URL] = _COMPUTED_;
			
			break;
		}
	}
	
	if(nextURL == undefined) {
		if(downloadStarting)
			setTimeout(Explore, 20);
		else
			console.log("Thread end");
		
		return;
	}

	console.log("Explore", nextURL);

	ExploreURL(nextURL, function (URL) {
		
		//console.log("ExploreURLBack", nextURL);
		
		RequestAndResolve(URL, function ($URL) {
			
			//console.log("RequestAndResolveBack", $URL);
			
			exploreStack[$URL] = _FINISHED_;
			
			setTimeout(Explore, 0);
			
		});
		

		
	});
	
	
}

for(var i=0;i<__threadNumber__;i++)
	Explore();