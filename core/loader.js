Wiki.loader = {
load:function() {
	var currentPath = location.pathname.substr(1) //Remove the initial '/'	
	Wiki.file.read(currentPath,true)
	.then(Wiki.loader.parseWikiNode)	
}
,reload:function() {
	location.reload();
}
,replaceDOM:function(html) {
	document.open("text/html", "replace")
	document.write(html);
	document.close();
}
,typeMapper:{
	"zappwiki":"Zapp Wiki Page"
	,"systemerror":"Wiki Error Page"
	,"js":"Javascript File"
	,"css":"CSS File"
	,"png":"PNG File"
	,"jpg":"JPG File"
	,"jpeg":"JPEG File"
	,"bmp":"Bitmap File"
	,"txt":"Text File"
	,"md":"Markdown File"
	,"json":"JSON File"
	,"html":"HTML File"
}
,fnvHash:function(str) {
	var a = 2166136261
	for (var i = 0; i < str.length; i++) {
		a = a^(str.charCodeAt(i)%256)
		a = a*16777619
		a &= 0xffffffff
	}
	return a	
}
,parseWikiNode:async function(obj) {
	node = obj

	
	var fs = Wiki.fs
	/*
	REQUIRED FIELDS
	
	text
	type
	path
	
	TODO: REFACTOR SO JUST REPLACES PAGE?
	
	Also, make save just replace the page instead of reloading
	*/
		
	var tree = new Wiki.loader.AST(JSON.parse(await Wiki.file.tree()));//await Wiki.loader.genFsTree(Wiki.loader.treeBasePath)
	var htmlTree = Wiki.loader.genHtmlTree(tree,obj.path)
	
	
	document.getElementById("treeDiv").innerHTML = htmlTree
	
	if (obj.type == "systemerror") {
		document.getElementById('editMenu').style.display = 'none' 
		document.getElementById('editMenu_expandSidebar').style.display = 'none' 
	} else {
		document.getElementById('editMenu').style.display = '' 
	}
	
	//out = Wiki.loader.replace(out,"/*WIKINODE*/","var node = "+JSON.stringify(obj))
	
	if (!obj.include) {
		obj.include = ""
	}
	
	if (!obj.preload) {
		obj.preload = ""
	}
	
	if (!obj.postload) {
		obj.postload = ""
	}	
	
	if (typeof obj.includePath == "undefined") {
		node.includePath = "system/config/include.txt"						
	}
	
	var standardInclude = await fs.readFileAsync(node.includePath)
	var combinedInclude = standardInclude+"\n"+obj.include
	
	if (obj.preload) {
		var preloadTempFile = "system/user/preload.js"
		//var preloadTempFile = "system/temp/preload_"+Wiki.loader.fnvHash(obj.path)+".js"
		
		await Wiki.fs.setPreloadAsync(obj.preload)
		//await fs.writeFileAsync(preloadTempFile,obj.preload) //Do this so we can actually debug it
		combinedInclude += "\n/"+preloadTempFile
	}
	
	if (combinedInclude.match(/\S/)) {
		await Wiki.loader.parseInclude(combinedInclude,obj.path)
	}
	
	
		
	Wiki.runRuleList(Wiki.setup.rules); //Setup the page before running the postload script
	
	/* TODO: do we want to allow referencing postload scripts? Obviously we don't need it for preload (that would just be an include) but what about postload?
	var standardScript = await fs.readFileAsync("system/config/script.js")
	combinedScript = standardScript+"\n"+obj.script
	*/
	if (obj.postload) {
		
		var scriptTempFile = "system/user/postload.js" 
		//var scriptTempFile = "system/temp/script_"+Wiki.loader.fnvHash(obj.path)+".js" 
		
		await Wiki.fs.setPostloadAsync(obj.postload)
		//await fs.writeFileAsync(scriptTempFile,obj.postload)
		
		var pageScript = document.createElement( 'script' );
		pageScript.src = "/"+scriptTempFile
		document.body.appendChild(pageScript)
	}
}
,pageResources:[]
,parseInclude:async function(includeText,refpath,addToDocument) { 
	/*
	
	The reference path is to allow recursive calls to this function
	(produced when one include file references another one) to 
	correctly set the scope.
	
	If a secondary include file references a relative path, the path
	is supposed to be relative to THAT include, NOT to the page being
	loaded, so this function has to turn everything into global paths.
	
	If addToDocument is false, then it does NOT add the elements to the
	current document. This is useful for generating include lists for
	rendering pages.
	
	*/
	
	if (typeof addToDocument == "undefined") {
		addToDocument = true
	}
	
	
	var timeout = 500
	
	var include = includeText.split("\n")
	var parentPath = "/"+Wiki.utils.getParentPath(refpath)+"/"
	
	var includeList = []
	for (var i = 0; i<include.length; i++) {
		var path = include[i]
		if (path.match(/\S/) && path.substr(0,1) != "#") { //# marks comment
			if (Wiki.loader.pageResources.indexOf(path) == -1 || !addToDocument) {
				Wiki.loader.pageResources.push(path)
				if (path.substr(0,1) == "<") { //This allows people to include stuff with integrity tags, etc.
					if (!addToDocument) {
						includeList.push(path)
						continue;
					}
					var template = document.createElement('template');
					template.innerHTML = path;
					var elem = template.content.firstChild
					
					var loadpromise = new Promise(function(resolve,reject) {
						elem.addEventListener("load",function(event) {resolve();})
						
						setTimeout(function() {
							//console.log("Timed out while loading "+path)
							resolve();
						},timeout); 
						
					})
					document.head.appendChild(elem)
					await loadpromise;
				} else {
					var extensionStart = path.lastIndexOf(".")
					
								
					if (extensionStart != -1) {
						var extension = path.substr(extensionStart+1)
						if (path.substr(0,1) != "/" && path.substr(0,4) != "http") { //If not already an absolute path..
							path = parentPath+path				
						}
						if (extension == "js") {
							if (!addToDocument) {
								includeList.push(path)
								continue;
							}
							
							
							var elem = document.createElement( 'script' );
							elem.src = path
							
							var loadpromise = new Promise(function(resolve,reject) {
								elem.addEventListener("load",function(event) {resolve();})
								
								setTimeout(function() {
									//console.log("Timed out while loading "+path)
									resolve();
								},timeout);
								
							}) 
							document.head.appendChild(elem)
							await loadpromise;
						} else if (extension == "css") {
							if (!addToDocument) {
								includeList.push(path)
								continue;
							}
							
							var elem = document.createElement( 'link' );
							elem.rel = "stylesheet"
							elem.href = path
							
							var loadpromise = new Promise(function(resolve,reject) {
								elem.addEventListener("load",function(event) {resolve();})
								
								setTimeout(function() {
									//console.log("Timed out while loading "+path)
									resolve();
								},timeout); 
								
							})
							document.head.appendChild(elem)
							await loadpromise;
						} else if (extension == "txt") {
							var data = await Wiki.fs.readFileAsync(path.substr(1)) //The substr(1) is to remove the initial slash.
							includeList = includeList.concat(await Wiki.loader.parseInclude(data,path.substr(1),addToDocument))
						}
					}
				}
			} else {
				console.log("WARNING: Tried to double load "+path)
			}
		}
	}
	return includeList
}
,replace:function(template,field,value) { //Do this to avoid taking care of the escapes in String.replace()
	var fieldStart = template.indexOf(field)
	var fieldEnd = fieldStart+field.length
	var before = template.substr(0,fieldStart)
	var after = template.substr(fieldEnd)
	return before+value+after
}
,systemerror:function(error,text,path) {
	if (!path) {
		path = "systemerror"
	}
	
	return {text:text,title:error,type:"systemerror",path:path}
}
,genFsTree:async function(path,isLower) {
	var fs = Wiki.fs
	
	var tree = new Wiki.loader.AST()
	var idx = new Wiki.loader.TreeIndex([])
	tree.addChild(idx,"directory") //do we want this?
	var lastSlash = path.lastIndexOf("/")
	var dirname = ""
	if (lastSlash != -1) {
		dirname = path.substr(lastSlash+1)
	}
	tree.addChild(idx,dirname)
	
	var directory = await fs.readdirAsync(path)
	for (var i = 0; i<directory.length; i++) {
		var name = directory[i]
		var stats = await fs.statAsync(path+"/"+name)
		if (stats.isFile()) {
			idx = tree.addChild(idx,["file"])
			

			var extensionStart = name.lastIndexOf(".")
			var extension = ""
			if (extensionStart != -1) {
				extension = name.substr(extensionStart+1)
			}
			
			name = name.substr(0,extensionStart) //remove the extension
			
			
			tree.addChild(idx,name)
			tree.addChild(idx,path+"/"+name)
			idx.pop()
		} else if (stats.isDirectory()) {
			var directoryTree = await Wiki.loader.genFsTree(path+"/"+name)
			tree.addChildTree(idx,directoryTree)
		}
	}
	
	return tree
}
,treeBasePath:"" //When this was server side, these used to be different.
,serverPath:""
,treeNodeIdCounter:0
,nextId:function() {
	var out = Wiki.loader.treeNodeIdCounter;
	Wiki.loader.treeNodeIdCounter++
	return out
}
,genHtmlTree:function(tree,path,isLower,isOnPath,pathIndex,globalPath) {
	var idx = new Wiki.loader.TreeIndex([2]) //Skip the intial "directory" and the root dir name.
	
	var html = ""
	if (!isLower) {
		//console.log("TreePath: "+path)
		
		html += '<ol class="tree">'
		Wiki.loader.treeNodeIdCounter = 0 //Reset the counter
		isOnPath = true
		pathIndex = 0
		path = path.split("/")
		globalPath = ""
	} else {
		var foldername = tree.getNode(new Wiki.loader.TreeIndex([1]))
		var nodeId = Wiki.loader.nextId();
		//console.log("Folder: "+foldername+" Onpath: "+isOnPath)
		
		//OLD FOLDERS THAT AREN'T LINKS. CLICKING ON THE NAMES WILL EXPAND/COLLAPSE THE FOLDER
		//html+='<label for="'+nodeId+'">'+foldername+'</label> <input type="checkbox" id="'+nodeId+'"'+(isOnPath ? 'checked' : '')+ '/>'
		
		html+='<label for="'+nodeId+'"><a href="'+globalPath+'">'+foldername+'</a></label> <input type="checkbox" id="'+nodeId+'"'+(isOnPath ? 'checked' : '')+ '/>'
		html+='<ol>'
	}
	
	for (var i = 2; i<tree.tree.length; i++) {
		var node = tree.getNode(idx)
		var type = node[0]
		if (type == "file") {
			var name = node[1]
			var filepath = node[2]
			var isCurrent = filepath == "/"+path.join("/")
			filepath = filepath.replace(Wiki.loader.treeBasePath,Wiki.loader.serverPath)
			var type = Wiki.utils.getType(filepath)
			if (type=="zappwiki") {
				name = name.substr(0,name.length-type.length-1) //-1 is for "."
			}
			
			if (type != "zappwiki") {
				filepath += "?view=wiki"
			}
			var linkPath = filepath.replace(/'/g,"\\'")
			if (isCurrent) {
				html+='<li class="file treeElement currentFile"><a onclick="Wiki.openPage(\''+linkPath+'\')">'+name+'</a></li>'
			} else {
				html+='<li class="file treeElement"><a onclick="Wiki.openPage(\''+linkPath+'\')">'+name+'</a></li>'
			}
		} else {
			var subtree = new Wiki.loader.AST(node)
			var dirname = node[1]
			//console.log("Dirname: "+dirname+" Needed: "+path[pathIndex])
			var nextOnPath = false
			if (dirname === path[pathIndex] && isOnPath) {
				nextOnPath = true
			}

			//TODO: FIX! Doesn't work and appears to cause problems on systemerror
			//var pathToMatch = "/"+path.slice(0,path.length-1).join("/")
			var isCurrent = false//globalPath+"/"+dirname == pathToMatch && Wiki.loader.getName(path[path.length-1]) == "index"			
			html += '<li class="treeElement'+(isCurrent ? " currentFile" : "")+'">'+Wiki.loader.genHtmlTree(subtree,path,true,nextOnPath,pathIndex+1,globalPath+"/"+dirname)+'</li>'
		}
		idx.nextChild();
	}
	
	
	html += '</ol>' //You always need to do this, regardless if it is on top or not.
	
	
	return html
}
,AST:class{
	constructor(tree) {
		if (!tree) {
			this.tree = []
		} else {
			this.tree = tree //There is not a tree.slice(0) here on purpose. 
		}
	}
	
	getNode(treeIndex) {
		var node = this.tree
		for (var i = 0; i<treeIndex.indexList.length; i++) {
			node = node[treeIndex.indexList[i]]
			if (!node) {
				return //throw "Node -"+treeIndex.indexList.slice(0,i).join("-")+" does not exist in this tree."
			}
		}
		return node
	}
	
	getFirstChild(treeIndex) {
		var node = this.getNode(treeIndex)
		return node[0]	
	}
		
	lastChildIndex(treeIndex) { //get the index of the last child of treeIndex
		var parentNode = this.getNode(treeIndex)
		var lastChildNum = parentNode.length-1
		var duplicated = treeIndex.duplicate()
		duplicated.push(lastChildNum)
		return duplicated
	}
	
	addChild(treeIndex,child) { //treeIndex = treeIndex of parent
		//This returns the index of the new child
		var parentNode = this.getNode(treeIndex)
		parentNode.push(child)
		return this.lastChildIndex(treeIndex)
	}
	
	addChildren(treeIndex,children) {
		var parentNode = this.getNode(treeIndex)
		for (var i = 0; i<children.length; i++) {
			parentNode.push(children[i])
		}
	}
	
	addChildTree(treeIndex,tree) {
		if (Array.isArray(tree)) {
			this.addChildren(treeIndex,tree)
		} else if (typeof tree == "number" || typeof tree == "string") {
			this.addChild(treeIndex,tree)
		} else {
			this.addChild(treeIndex,tree.tree)
		}
	}
	
	deleteNode(treeIndex) { //treeIndex = treeIndex of node
		var parentNode = this.getNode(treeIndex.parentIndex)
		delete parentNode[treeIndex.childNumber]
	}
	
	iterate(callback,index) { //index is not used by a standard user. It is used internally here to allow for a recursive algorithm. NOTE: index is an Array, not a TreeIndex
		var isTop = false //if we are iterating on the root node
		if (typeof index == "undefined") {
			index = []
			isTop = true
		}
		index.push(0)
		
		for (var i = 0; i<this.tree.length; i++) {
			index[index.length-1] = i
			if (i != 1 || isTop) {//Skip the name of the node (i=0) unless we are iterating on the root node
				var node = this.tree[i]
				if (typeof node != "undefined") {
					callback(new TreeIndex(index))
					if (!Array.isArray(node)) {
						//Do nothing
					} else {				
						var nodeAst = new AST(node)
						nodeAst.iterate(callback,index)
					}
				}
			}
		}
	}
	
	merge() { //This simply merges all nodes, loosing all the indenting information.
		var out = ""
		for (var i = 0; i<this.tree.length; i++) {
			var node = this.tree[i]
			if (typeof node != "undefined") {
				if (!Array.isArray(node)) {
					out += node.toString()
				} else {
					var nodeAst = new AST(node)
					out += nodeAst.merge()
				}
				
				if (i != this.tree.length-1) {
					out += "\n"
				}
			}
		}
		return out	
	}	
	toHTML(indentLevel) {
		var doPreWrapper =false
		if (typeof indentLevel == "undefined") {
			indentLevel = 0
			doPreWrapper = true
		}
		
		var indentString = ""
		for (var j = 0; j<indentLevel-1; j++) { //The first line is NOT supposed to be indented. We add the last \t below, after the first line
			indentString += "\t"
		}
		
	
		var out = ""
		if (doPreWrapper) {
			out = "<pre>"
		}
		for (var i = 0; i<this.tree.length; i++) {
			var node = this.tree[i]
			if (typeof node != "undefined") {
				if (!Array.isArray(node)) {
					if (i == 0) {
						out += indentString
						out += "<b>"+node.toString()+"</b>"
						indentString += "\t"
					} else {
						out += indentString
						out += node.toString()
					}
				} else {
					var nodeAst = new AST(node)
					out += nodeAst.toHTML(indentLevel+1)
				}
				
				if (i != this.tree.length-1) {
					out += "\n"
				}
			}			
		}
		if (doPreWrapper) {
			out += "</pre>"
		}
		
		return out
	}
}
,TreeIndex:class {
	constructor(indexList) { //Index list is a list of indexes into sub-nodes in tree. An empty array specifies the root node. Standard notation for array [0,1,2,3,4,5]: -0-1-2-3-4-5
		this.indexList = indexList
	}
	
	push(val) {
		return this.indexList.push(val)
	}
	
	pop() {
		return this.indexList.pop()
	}
	
	get parentIndex() {
		var parentIndex = this.indexList.slice(0,this.indexList.length-1) //Remove the last element
		return new TreeIndex(parentIndex)
	}
	
	get childNumber() {
		return this.indexList[this.indexList.length-1]
	}
	
	get firstAncestor() {
		return new TreeIndex(this.indexList[0])
	}
	
	nextChild() {//Go to the next child
		this.indexList[this.indexList.length-1]++
	}
	
	duplicate() {
		return new Wiki.loader.TreeIndex(this.indexList.slice(0))
	}
}
}