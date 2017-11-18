class WikiSearch {
	constructor(search,options) {
		if (!options) {
			options = {}
		}
		
		var defaultOptions = { //TODO: maybe make this accessible from the WikiSearch object?
			//Standard rule for adding options: setting the option to true makes the search more complicated/longer, etc.
			searchSystem:false
			,fullText:true
			,allExtensions:true
			,allFields:true
		}
		
		this.options = WikiSearch.interleaveObjects(options,defaultOptions)
		this.search = search	
	}	
	
	
	static interleaveObjects(obj,def) {
		var objK = Object.keys(obj) //obj's keys
		var defK = Object.keys(def) //def's keys
		
		var combined = defK
		for (var i = 0; i<objK.length; i++) {
			if (combined.indexOf(objK[i]) == -1) {
				combined.push(objK[i])				
			}			
		}
		
		var out = {}
		for (var j = 0; j<combined.length; j++) {
			var key = combined[j]
			if (typeof obj[key] != "undefined") {
				out[key] = obj[key]
			} else {
				out[key] = def[key]				
			}			
		}
		return out
	}
	
	on(event,callback) {
		if (event == "result") {
			this.onresult = callback
		} else if (event == "end") {
			this.onend = callback
		}
	}
	
	start() {
		this.idx = new Wiki.loader.TreeIndex([0])
		this.state = 0;
		this.continueSearch();
	}
	
	parseTree(tree) {
		this.tree = new Wiki.loader.AST(JSON.parse(tree));
		this.state = 1
		this.continueSearch();
	}
	
	continueSearch(data) {
		/*
		STATES
		
		0 - tree not loaded
		1 - iterating over directory
		2 - file data to parse
		
		
		*/
		if (this.state == 0) {
			Wiki.sendRaw("SEARCHTREE",this.parseTree.bind(this))			
		} else if (this.state == 1) {
			var node = this.tree.getNode(this.idx)
			if (!node) {
				this.idx.pop();
				if (this.idx.indexList.length == 0) {
					//We're done
					this.done = true;
				}
			} else {
				var type = node[0]
				var name = node[1]
				if (type == "file") {
					var path = node[2].substr(1) //Remove the inital slash
					var extension = Wiki.utils.getType(name)
					if (this.options.allExtensions || this.options.extensions.indexOf(extension) != -1) {
						this.state = 2
						this.fileType = type
						this.filePath = path
						this.fileName = name
						this.fileExtension = extension
						Wiki.file.read(path,false).then(this.continueSearch.bind(this))
					}					
				} else if (type == "directory") {
					if (name != "system" && !this.options.searchSystem) {
						this.idx.push(2) //2 is the actual start of the data inside a directory node. 0 is type, 1 is path	
					}					
				}
			}
			
			this.idx.nextChild();
			if (!this.done) {
				if (this.state != 2) {
					setTimeout(this.continueSearch.bind(this),0)
				}
			} else {
				if (this.onend) {
					this.onend();
				}
			}
		} else if (this.state == 2) { //search loaded data
			var type = this.fileType
			var path = this.filePath
			var name = this.fileName
			if (data.type == "zappwiki") {
				var keys = Object.keys(data)
				for (var i = 0; i<keys.length; i++) {
					var key = keys[i]
					if (this.options.allFields || this.options.fields.indexOf(key) != -1) {
						var matches = data[key].toString().toLowerCase().match(this.search.toLowerCase())
						if (matches) {	
							var result = {
								path:path
								,extension:this.fileExtension
								,name:name
								,numMatches:matches.length
							}
						}
					}
				}
			} else if (data.type != "systemerror") {
				var matches = data.text.toLowerCase().match(this.search.toLowerCase())
				if (matches) {	
					var result = {
						path:path
						,extension:this.fileExtension
						,name:name
						,numMatches:matches.length
					}
					
				}
			}
			if (this.onresult && result) {
				this.onresult(result)
			}
			this.state = 1
			setTimeout(this.continueSearch.bind(this),0)
		}		
	}	
}