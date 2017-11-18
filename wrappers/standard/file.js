Wiki.file = {
	save:async function(obj) { //can't use "node" for this because that is the global page variable. So call it "obj". (Although this will almost always mean "node")
		var fs = Wiki.fs
		console.log("Got save command: "+obj.path)
		console.log("Type: "+obj.type)
		if (obj.type == "zappwiki") {
			var nodeCopy = JSON.parse(JSON.stringify(obj))
			
			/*
			nodeCopy.text = nodeCopy.text.split("\n") //Save it this way so git diffs are useful
			
			
			if (nodeCopy.preload) nodeCopy.preload = nodeCopy.preload.split("\n");
			if (nodeCopy.postload) nodeCopy.postload = nodeCopy.postload.split("\n");
			if (nodeCopy.include) nodeCopy.include = nodeCopy.include.split("\n");
			*/
			delete nodeCopy.path //Dont save the path			
			
			nodeCopy.format = "ZWP v3"
			
			var data = JSON.stringify(nodeCopy)
			/*
			data = data.replace(/\,/g,"\n,")
			data = data.replace(/\{/g,"{\n")
			data = data.replace(/\}/g,"\n}")
			data = data.replace(/\[/g,"[\n")
			data = data.replace(/\]/g,"\n]")
			*/
			await fs.writeFileAsync(obj.path,data)
		} else {
			await fs.writeFileAsync(obj.path,obj.text)
		}
	}
	,read:async function(wikiPath,getTimestamp) {
		var fs = Wiki.fs
		var obj = {}
		
		wikiPath = wikiPath.split("%20").join(" ")
		
		var lastSlashIndex = wikiPath.lastIndexOf("/")
		var parentPath
		if (lastSlashIndex == -1) {
			parentPath = ""
		} else {
			parentPath = wikiPath.substr(0,lastSlashIndex+1) //get the slash
		}
		
			

		if (!(await fs.existsAsync(parentPath))) {
			return Wiki.loader.systemerror("Not Found","The parent path of '"+wikiPath+"' was not found in this wiki.",wikiPath)
		}
		
		var pagename = Wiki.utils.getName(wikiPath)
		var fileExtension = Wiki.utils.getType(wikiPath)
		if (await fs.existsAsync(wikiPath)) {
			if (!Wiki.loader.typeMapper[fileExtension.toLowerCase()]) {
				return Wiki.loader.systemerror("Unaccepted File Type","."+fileExtension.toLowerCase()+" files are not currently supported.")
			} else {
				if (fileExtension == "zappwiki") {
					var data = (await fs.readFileAsync(wikiPath)).replace(/\n/g,"") 
					obj = JSON.parse(data)				
				} else {
					var imageExtensions = [
						"png"
						,"jpg"
						,"bmp"
						,"jpeg"						
					]
					
					if (imageExtensions.indexOf(fileExtension.toLowerCase()) != -1) {
						obj.text = wikiPath
					} else {							
						obj.text = (await fs.readFileAsync(wikiPath,"utf8"))
					}
					
					obj.title = pagename+"."+fileExtension
				}
				
				obj.path = wikiPath
				obj.type = fileExtension
				if (getTimestamp) {
					obj.timestamp = (await fs.statAsync(wikiPath)).mtime.getTime()
				}
				
				if (obj.script) {
					obj.postload = obj.script
					delete obj.script
				}
				
				if (Array.isArray(obj.text)) {
					obj.text = obj.text.join("\n")
					console.warn("Got ZWP v2 page");
				} else if (!obj.format) {
					console.warn("Got ZWP v1 page")
				} else {
					console.log("Got ZWP v3 page");
				}
				
				if (Array.isArray(obj.postload)) {
					obj.postload = obj.postload.join("\n")
				}
				
				if (Array.isArray(obj.preload)) {
					obj.preload = obj.preload.join("\n")
				}
				
				if (Array.isArray(obj.include)) {
					obj.include = obj.include.join("\n")
				}
				return obj
			}			
		} else {
			return Wiki.loader.systemerror("Not Found","The file '"+wikiPath+"' was not found in this wiki.",wikiPath)
		}
	}	
	,newPage:async function(path) {
		var newPage = {
			title:"New Wiki Page"
			,text:""
			//,path:path
			,type:"zappwiki"		
		}
		
		var fs = Wiki.fs
		
		if (!await fs.existsAsync(path)) { //don't overwrite
			await fs.writeFileAsync(path+".zappwiki",JSON.stringify(newPage))	
		}
	}
	,newJournal:async function(path) {
		var date = new Date()
		var day = date.getDate();
		
		var monthNum = date.getMonth();
		var monthNames = [
			"January"
			,"February"
			,"March"
			,"April"
			,"May"
			,"June"
			,"July"
			,"August"
			,"September"
			,"October"
			,"November"
			,"December"
		]
		
		var month = monthNames[monthNum]
		
		var year = date.getFullYear()
		
		
		var title = month+" "+day+", "+year
		var newPage = {
			title:title
			,text:""
			//,path:path
			,type:"zappwiki"		
		}
		
		var fs = Wiki.fs
		
		if (!await fs.existsAsync(path)) { //don't overwrite
			await fs.writeFileAsync(path+".zappwiki",JSON.stringify(newPage))	
		}
	}
	,remove:async function(path) {
		var fs = Wiki.fs
		if (await fs.existsAsync(path)) {
			//Note that path is a path inside the wiki
			console.log("Deleting: "+path)		
			
			
			var actualPath = path
			var stats = await fs.statAsync(actualPath)
			if (stats.isDirectory()) {
				await fs.rmdirAsync(actualPath)
			} else {
				await fs.unlinkAsync(actualPath)
			}
			
			/*
			var parentPath = path.split("/");
			parentPath.pop()
			parentPath = parentPath.join("/")
			var dir = await fs.readdirAsync(parentPath)
			if (dir.length == 0) { //If there is nothing left in the directory...
				Wiki.file.remove(parentPath) //TODO: will calling this recursively possibly cause race conditions? (i.e., the parent dir gets deleted before stuff inside it finishes or something?)
			}
			*/
		}
	}	
	,mkdir:async function(path) {
		var fs = Wiki.fs
		if (!(await fs.existsAsync(path))) {
			console.log("Making directory: "+path)
			await fs.mkdirAsync(path)
			await Wiki.file.newPage(path+"/index") //Make a new page so there is something in the directory to start from.
		}		
	}	
	,copy:async function(obj) {	
		var fs = Wiki.fs
		var path = obj.path
		while (await fs.existsAsync(path)) {
			path = path.split(".")
			path[path.length-2] += " Copy"
			path = path.join(".")
		}
		if (obj.type == "zappwiki") {
			var data = JSON.stringify(obj)
			await fs.writeFileAsync(path,data)
		} else {
			await fs.writeFileAsync(path,obj.text)
		}
	}	
	,move:async function(oldPath,newPath) {
		var fs = Wiki.fs
		
		var oldType = Wiki.utils.getType(oldPath)
		var newType = Wiki.utils.getType(newPath)
		//TODO: have something check for overwrites
		if (oldType != newType) {
			if (newType == "zappwiki") { //old type must have been something else
				var oldData = await fs.readFileAsync(oldPath,"utf8")
				var oldName = Wiki.utils.getName(oldPath)
				var newPage = {
					type:"zappwiki"
					,title:oldName
					//,path:obj.newPath
					,text:oldData.split("\n") //See above for why this is line-saved
				}
				
				await fs.writeFileAsync(newPath,JSON.stringify(newPage))
			} else { //going from zappwiki to something else
				var oldData = await Wiki.file.read(oldPath,false)
				var text = oldData.text
				await fs.writeFileAsync(newPath,text)
			}
			await fs.unlinkAsync(oldPath) //Delete the old file.
		} else {
			await fs.renameAsync(oldPath,newPath)
		}
	}
	,logout:function() {
		Wiki.sendRaw("LOGOUT",function() {
			location.assign("/home")
		})
	}
	,getUserData:async function() {
		return JSON.parse(await Wiki.sendRawAsync("USERDATA"))
	}
	,addRemote:function(name,path,callback) { //Note these synchronization commands require an auth level of 0 for adding remotes and 1 for syncing
		Wiki.sendArray(["ADDREMOTE",name,path],function() {
			callback();
		})
	}
	,removeRemote:function(name,path,callback) {
		Wiki.sendArray(["REMOVEREMOTE",name,path],function() {
			callback();
		})
	}
	,getRemotes:function(callback) {
		Wiki.sendArray(["GETREMOTES"],function(data) {
			callback(JSON.parse(data));
		})
	}
	,sync:function(callback) {
		Wiki.sendArray(["SYNC"],function(data) {
			callback(data);
		})
	}
	,saveStorage(callback) {
		Wiki.sendArray(["SAVESTORAGE",JSON.stringify(Wiki.storage)],callback);
	}
	,tree:async function() {
		return await Wiki.sendRawAsync("TREE")
	}
	
	,mkuser:async function(username,password) {
		return await Wiki.sendArray(["MKUSER",username,password])
	}
	,rmuser:async function(username) {
		return await Wiki.sendArray(["RMUSER",username])
	}
}

