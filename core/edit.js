Wiki.edit = {
	rules:[
		{
			name:"default_checklocked"
			,rule:function() {
				if (node.locked) {
					var shouldEdit = confirm("File is locked. Are you sure you want to edit it?");
					if (!shouldEdit) {
						Wiki.cancelEdit();
					}
				}				
			}			
		}
		,{
			name:"default_checkpermissions"
			,rule:function() {
				if (Wiki.user.l >= 3) {
					alert("You do not have permission to edit this file.")
					Wiki.cancelEdit();					
				}				
			}			
		}
		,{
			name:"default_addsaveshortcut"
			,rule:function() {
				window.addEventListener("keydown",function(event) {
					if (event.key == "s" && event.ctrlKey) {
						var wysiwyg = Wiki.wysiwyg
						Wiki.saveNoReload();
						event.preventDefault();
						console.log("Saved page.")
						if (Wiki.wysiwyg != wysiwyg) {
							Wiki.toggleWYSIWYG();
						}
					}
				})				
			}			
		}
		,{
			name:"default_edit_bodyinit"
			,rule:function() {
				Wiki.body = document.getElementById("body")
			}			
		}
		,{
			name:"default_edit_wikipage_setup_addheader"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML = 
					"<h1 class='pagetitle'><input id='titleedit' class='headerInput' type='text' style='width:100%;height:80px;'></input></h1><BR><i><input id='subtitleedit' class='headerInput' style='width:100%'></input></i><BR><BR>"
				}
			}
		}
		,{
			name:"default_edit_wikipage_setup_addwysiwygbutton"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML +="<BR><a onclick='Wiki.toggleWYSIWYG()' id='wysiwygToggle' style='cursor:pointer'>WYSIWYG</a>"
				}
			}
		}		
		,{
			name:"default_edit_wikipage_setup_addbody"
			,rule:function() {
				if (node.type == "zappwiki") {
					Wiki.body.innerHTML += 
					"<hr><div id='texteditwrapper'><textarea id='textedit' style='width:100%'></textarea></div><BR><BR>"
					+"<h2>Include</h2><textarea style='width:100%' id='includeedit'></textarea>"
					+"<h2>Scripts</h2>"
					+"<h3>Preload</h3><div class='isResizable' id='preloadeditWrapper'><textarea style='width:100%' id='preloadedit'></textarea></div>"
					+"<h3>Postload</h3><div class='isResizable' id='postloadeditWrapper'><textarea style='width:100%' id='postloadedit'></textarea></div>"
				}
			}
		}
		,{
			name:"default_edit_wikipage_setup"
			,rule:function() {
				if (node.type=="zappwiki") {
					//The scripts and include stuff probably never happen because the same thing happens in the loader...
					if (!node.postload) {
						node.postload = ""
					}
					if (!node.include) {
						node.include = ""
					}
					if (!node.preload) {
						node.preload = ""
					}
					if (!node.subtitle) {
						node.subtitle = ""
					}
					
					document.getElementById("titleedit").value = node.title
					document.getElementById("subtitleedit").value = node.subtitle
					document.getElementById('textedit').value = node.text
					Wiki.autoGrow(document.getElementById('textedit'))
					
					document.getElementById('postloadedit').value = node.postload
					document.getElementById('includeedit').value = node.include
					document.getElementById('preloadedit').value = node.preload
					
					//Wiki.autoGrow(document.getElementById('postloadedit'))
					Wiki.autoGrow(document.getElementById('includeedit'))
					//Wiki.autoGrow(document.getElementById('preloadedit'))
					
					if (CodeMirror) {
						var config = {
							lineNumbers:true
                          	,indentWithTabs:true
                          	,indentUnit:4
							,mode:"javascript"
						}
						Wiki.codeMirrorPostloadEdit = CodeMirror.fromTextArea(document.getElementById('postloadedit'),config);
						Wiki.codeMirrorPreloadEdit = CodeMirror.fromTextArea(document.getElementById('preloadedit'),config);
						
						//To this to stop the editors from continually expanding when the user resizes them.
						document.getElementById('postloadeditWrapper').style.height = window.getComputedStyle(document.getElementById("postloadeditWrapper")).height
						document.getElementById('preloadeditWrapper').style.height = window.getComputedStyle(document.getElementById("preloadeditWrapper")).height
						
						setInterval(Wiki.updateEditorSizes,200)
					}
				}				
			}
		}
		,{
			name:"default_edit_wikipage_setup_settings"
			,rule:function() {
				if (node.type=="zappwiki") {
					if (typeof node.includePath == "undefined") {
						node.includePath = "system/config/include.txt"						
					}
					
					document.getElementById("includePathEdit").value = node.includePath
					
					if (!node.locked) {
						node.locked = false;
					}
					
					document.getElementById("lockFileBox").checked = node.locked
				}				
			}			
		}
		,{
			name:"default_edit_imgpage"
			,rule:function() {
				if (Wiki.imageExtensions.indexOf(node.type) != -1) {
					alert("Editing images is currently not supported.")
					Wiki.editing = false
					Wiki.updateEditClasses()
				}
			}
		}
		,{
			name:"default_edit_codepage"
			,rule:function() {
				if (node.type != "zappwiki" && Wiki.imageExtensions.indexOf(node.type) == -1) {
					Wiki.body.innerHTML = "<h1 class='pagetitle'>"+node.title+"</h1><div style='border:1px solid gray;'><textarea id='textedit' style='width:100%'></textarea></div>"
					document.getElementById('textedit').value = node.text
					Wiki.autoGrow(document.getElementById('textedit'))
					if (CodeMirror) {
						var modeMapper = {
							"html":"text/html"
							,"css":"css"
							,"js":"javascript"				
						}
						
						
						var config = {
							lineNumbers:true
                          	,indentWithTabs:true
                          	,indentUnit:4
							,mode:modeMapper[node.type]
						}
						Wiki.codeMirrorTextEdit = CodeMirror.fromTextArea(document.getElementById('textedit'),config);
						Wiki.codeMirrorTextEdit.setSize(null,"90vh")
					}
				}
			}			
		}
		,{
			name:"default_readprefs_defaulteditmode"
			,rule:function() {
				if (node.type == "zappwiki") {
					var pref = Wiki.getPref("core-editor-defaulteditmode")
					if (pref == "wysiwyg") {
						Wiki.toggleWYSIWYG();
					}
				}
			}			
		}
	]
	,updateEditorSizes:function() {
		if (Wiki.codeMirrorPreloadEdit) {
			var w = window.getComputedStyle(document.getElementById("preloadeditWrapper")).width
			var h = window.getComputedStyle(document.getElementById("preloadeditWrapper")).height
			Wiki.codeMirrorPreloadEdit.setSize(w,h)
			Wiki.codeMirrorPreloadEdit.refresh()
		}
		
		if (Wiki.codeMirrorPostloadEdit) {
			var w = window.getComputedStyle(document.getElementById("postloadeditWrapper")).width
			var h = window.getComputedStyle(document.getElementById("postloadeditWrapper")).height
			Wiki.codeMirrorPostloadEdit.setSize(w,h)
			Wiki.codeMirrorPostloadEdit.refresh()
		}		
	}
}