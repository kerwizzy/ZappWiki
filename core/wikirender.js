Wiki.render = {
	genIncludeList:async function(obj) {
		if (obj.type != "systemerror") {
			if (typeof obj.includePath == "undefined") {
				obj.includePath = "system/config/include.txt"						
			}		
		
			var standardInclude = await Wiki.fs.readFileAsync(obj.includePath)
			var combinedInclude = standardInclude+"\n"+obj.include
			
			
			if (combinedInclude.match(/\S/)) {
				return await Wiki.loader.parseInclude(combinedInclude,obj.path,false)
			}
		}		
	}
	

}