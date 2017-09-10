console.log("Promises loaded!")
Wiki.fs = {
	//Note that these all return Promises, so they can be used with await.
	writeFileAsync(path,data,encoding) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.writeFile(path,data,encoding,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})			
	}
	,readFileAsync(path,encoding) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.readFile(path,encoding,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,statAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.stat(path,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,readdirAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.readdir(path,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,renameAsync(oldpath,newpath) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.rename(oldpath,newpath,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,mkdirAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.mkdir(path,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,rmdirAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.rmdir(path,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,unlinkAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.unlink(path,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,existsAsync(path) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.exists(path,function(res) {
			resolve(res)
		})})
	}
	,setPreloadAsync(data) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.setPreload(data,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
	,setPostloadAsync(data) {
		return new Promise(function(resolve,reject) {
		Wiki.fs.setPostload(data,function(err,res) {
			if (err) {
				reject(err)
			} else {
				resolve(res)
			}
		})})
	}
}