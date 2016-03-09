fs = require("fs");
url = require("url");
path = require("path");

mainDomain = "exemple.org/path";

current = "http://exemple.org/path";

p = url.parse(current);

currPath = p.pathname;
currDomain = p.hostname;

__forceRelative__ = true;
__disableContraction__ = false;





file = fs.readFileSync("input.html").toString();

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
		
		
		
		if(sep != "'" && sep != '"') {
					
			bucket.push("");
			bucket.push('http://'+split[i]);

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
		
		var parse = url.parse("http://"+bucket[i]);

		if(mainDomain == currDomain) { //si on est sur le domaine principale
			
			if(parse.hostname == currDomain) {
				if(__forceRelative__ || currPath[0] != "/")
					bucket[i] = path.relative(currPath, parse.pathname);
				else
					bucket[i] = parse.pathname;					
			}
			else {
				bucket[i] = "/extern/" + parse.hostname + parse.pathname;
			}
		
		}
		else {
			
			if(parse.hostname == currDomain) {
				bucket[i] = path.relative(currPath, parse.pathname);
			}
			else if(parse.hostname == mainDomain) {
				
				if(__forceRelative__ || currPath[0] != "/")
					bucket[i] = path.relative("/extern/" + currDomain + currPath, parse.pathname);
				else
					bucket[i] = parse.pathname;
			}
			else {
				bucket[i] = "/extern/" + parse.hostname + parse.pathname;
			}
			
		}
		
		console.log(bucket[i]);

	}


	
	fs.writeFileSync("output.html", bucket.join(""));

	


	//TODO 	http:\/\/exemple.org\/p\/a\/t\/h\/
