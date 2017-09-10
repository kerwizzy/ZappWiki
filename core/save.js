Wiki.save = {
rules:[
	{
		name:"default_save_savecodemirror"
		,rule:function() {
			if (Wiki.codeMirrorTextEdit) {
				Wiki.codeMirrorTextEdit.save()
			} else if (Wiki.codeMirrorPostloadEdit) {
				Wiki.codeMirrorPostloadEdit.save();
				Wiki.codeMirrorPreloadEdit.save();
			}								
		}
	}
	,{
		name:"default_save_wysiwyg"
		,rule:function() {
			if (Wiki.wysiwyg) {
				node.text = "@@"+Wiki.wysiwygEditor.html+"@@"
			}
		}			
	}
	,{
		name:"default_save_text"
		,rule:function() {
			if (!Wiki.wysiwyg) {
				node.text = document.getElementById('textedit').value
			}				
		}
	}
	,{
		name:"default_save_wikipage"
		,rule:function() {
			if (node.type == "zappwiki") {
				node.title = document.getElementById("titleedit").value
				node.subtitle = document.getElementById("subtitleedit").value
				node.postload = document.getElementById('postloadedit').value
				node.include = document.getElementById('includeedit').value
				node.preload = document.getElementById('preloadedit').value
				
				if (!node.subtitle) {
					delete node.subtitle
				}
				
				if (!node.postload) {
					delete node.postload
				}
				
				if (!node.include) {
					delete node.include
				}
				
				if (!node.preload) {
					delete node.preload
				}
			}
		}
	}
	,{
		name:"default_save_wikipage_settings"
		,rule:function() {
			if (node.type == "zappwiki") {
				node.includePath = document.getElementById("includePathEdit").value
				if (node.includePath == "system/config/include.txt") {
					delete node.includePath
				}
				
				node.locked = document.getElementById("lockFileBox").checked
				if (!node.locked) {
					node.locked = false;
				}				
			}	
		}		
	}
]
}