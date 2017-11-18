Wiki.exporters= {
	rules:[
		{
			name:"html"
			,text:"Export as HTML"
			,generate:function() {
				return {data:document.getElementById("body").innerHTML,name:Wiki.utils.getName(node.path)+".html",mimetype:"text/html"}
			}
		}
	]

	,initSidebar() {
		var panel = {title:"Export",icon:"save",buttons:[]}
		for (var i = 0; i<Wiki.exporters.rules.length; i++) {
			var rule = Wiki.exporters.rules[i]
			panel.buttons.push({text:rule.text,action:'Wiki.exporters.saveAs("'+rule.name+'")'})
		}
		Wiki.ui.addSidebarButtonPanel(panel)
	}

	,saveAs(name) {
		for (var i = 0; i<Wiki.exporters.rules.length; i++) {
			var rule = Wiki.exporters.rules[i]
			if (rule.name == name) {
				var obj = rule.generate()
				Wiki.exporters.openDownload(obj.name,obj.data,obj.mimetype)
			}
		}	
	}

	,openDownload(filename, text, mimetype) {
		var downloadElement = document.createElement('a');
		downloadElement.setAttribute('href', 'data:'+mimetype+';charset=utf-8,' + encodeURIComponent(text));
		downloadElement.setAttribute('download', filename);

		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			downloadElement.dispatchEvent(event);
		}
		else {
			downloadElement.click();
		}
	}
}
