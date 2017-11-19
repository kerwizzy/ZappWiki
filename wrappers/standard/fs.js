Wiki.utils.combineObjects(Wiki.fs,{ //Functions for a standard server with no additional authentication, signatures, etc.
	writeFile:function(path,data,encoding,callback) { 
		if (!encoding) {
			encoding = "utf8"
		}
	
		Wiki.sendArray(["WRITE",path,encoding,data],function(res) {
			callback(undefined,res) //Undefined takes place of error
		})
	}
	,readFile:function(path,encoding,callback) {
		if (!encoding) {
			encoding = "utf8"
		}
		
		Wiki.sendArray(["READ",path,encoding],function(res) {
			callback(undefined,res.replace(/\r\n/g,"\n"))
		})
	}
	,stat:function(path,callback) {
		Wiki.sendArray(["STAT",path],function(data) {
			class FsStats {
				constructor(statArray) {
					var indexNames = [
						"dev"
						,"ino"
						,"mode"
						,"nlink"
						,"uid"
						,"gid"
						,"rdev"
						,"size"
						,"blksize"
						,"blocks"
					]

					for (var i = 0; i<indexNames.length; i++) {
						this[indexNames[i]] = statArray[i]
					}
					
					this.atime = new Date(parseInt(statArray[indexNames.length]))
					this.mtime = new Date(parseInt(statArray[indexNames.length+1]))
					this.ctime = new Date(parseInt(statArray[indexNames.length+2]))
					this.birthtime = new Date(parseInt(statArray[indexNames.length+3]))
					
					this.isFileVal = statArray[indexNames.length+4] == "true"
					this.isDirectoryVal = statArray[indexNames.length+5] == "true"
				}
				
				isFile() {
					return this.isFileVal
				}
				
				isDirectory() {
					return this.isDirectoryVal
				}
			}
			
			data = data.split(",")
			var stat = new FsStats(data)
			
			callback(undefined,stat)
		})
	}
	,readdir:function(path,callback) {
		Wiki.sendArray(["READDIR",path],function(data) {
			data = data.split("\n")
			callback(undefined,data)
		})
	}
	,rename:function(oldpath,newpath,callback) {
		Wiki.sendArray(["RENAME",oldpath,newpath],function(err) {
			callback(err)
		})
	}
	,mkdir:function(path,callback) {
		Wiki.sendArray(["MKDIR",path],function(err) {
			callback(err)
		})
	}
	,rmdir:function(path,callback) {
		Wiki.sendArray(["RMDIR",path],function(res) {
			callback(undefined,res)
		})
	}
	,unlink:function(path,callback) {
		Wiki.sendArray(["UNLINK",path],function(res) {
			callback(undefined,res)
		})
	}
	,exists:function(path,callback) { //this is deprecated in node. have it here because it needs to be async anyway because of xhttp
		Wiki.sendArray(["EXISTS",path],function(data) {
			callback(data == "true")
		})
	}
	,setPreload(data,callback) {
		Wiki.sendArray(["SETPRELOAD",data],callback);
	}
	,setPostload(data,callback) {
		Wiki.sendArray(["SETPOSTLOAD",data],callback);
	}
	
})