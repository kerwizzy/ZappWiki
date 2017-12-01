Wiki.editor = class {
	constructor(wrapper,initHTML) {
		this.wrapper = wrapper
		this.element = document.createElement("DIV")
		this.element.innerHTML = initHTML
		this.toolbar = document.createElement("DIV")
		this.element.contentEditable = true
		this.wrapper.appendChild(this.toolbar)
		this.wrapper.appendChild(this.element)
		
		this.wrapper.className = "wikieditor wikieditor-wrapper"
		this.element.className = "wikieditor wikieditor-body"
		this.toolbar.className = "wikieditor wikieditor-toolbar"
		this.buttonGroups = []
		this.dropdowns = []
		this.shortcuts = []
		this.element.addEventListener("keydown",this.parseKeyEvent.bind(this))
		this.element.focus();
	}
	
	enableResize() {
		this.element.style.resize = "vertical"
	}
	
	get html() {
		return this.element.innerHTML
	}
	
	get selection() {
		var text = "";
		if (window.getSelection) {
			text = window.getSelection().toString();
		} else if (document.selection && document.selection.type != "Control") {
			text = document.selection.createRange().text;
		}
		return text;
	}
	
	get cursorIndex() {
		var sel = window.getSelection()
		var offset = sel.focusOffset
		var str = sel.focusNode.nodeValue.substr(0,offset)
		var done = false
		var node = sel.focusNode
		while (!done) {
			if (node.nodeType == 1) {
				offset += node.nodeName.length+2 //html tag is <TAG> (length of tag + two "<>")
				str = "<"+node.nodeName+">"+str
				//TODO: need to add length of attributes of the node too.
			}
			var prevSibling = node.previousSibling
			if (prevSibling) {
				node = prevSibling
				if (node.nodeType == 1) {
					offset += node.nodeName.length+3 //Add the length of the </TAG>
					str = "</"+node.nodeName+">"+str
					offset += node.innerHTML.length
					str = node.innerHTML+str
				}
			} else {
				node = node.parentNode
			}
			if (node.isSameNode(this.element)) {
				done = true
			}
		}
		//return offset
		return str
	}
	
	get height() {
		return this.element.style.height
	}
	
	set height(v) {
		this.element.style.height = v		
	}
	
	get width() {
		return this.element.style.width
	}
	
	set width(v) {
		this.element.style.width = v		
	}
	
	addButton(action,group,tooltip,classname,innerClass,shortcut) {
		var boundAction = action.bind(this)
		
		var button = document.createElement("BUTTON");
		var inner = document.createElement("I")
		inner.className = innerClass
		button.appendChild(inner)
		button.onclick=boundAction
		button.className = classname
		button.title = tooltip
		
		var foundGroup = false
		for (var i = 0; i<this.buttonGroups.length; i++) {
			var buttonGroup = this.buttonGroups[i]
			if (buttonGroup.name == group) {
				buttonGroup.buttons.push(button);
				foundGroup = true
			}
		}
		if (!foundGroup) {
			this.buttonGroups.push({name:group,buttons:[button]})
		}
		
		if (shortcut) {
			this.addShortcut(shortcut,action.bind(this))
		}		
	}
	
	addFaButton(action,group,tooltip,icon,shortcut) {
		this.addButton(action,group,tooltip,"btn btn-primary","fa fa-"+icon,shortcut);
	}
	
	addShortcut(shortcut,action) { //All control. so ctrl-b would be: addShortcut("b",editor.bold)
		/*
		addShortcut("b",editor.bold) -> ctrl-b makes stuff bold
		addShortcut("ctrl b",editor.bold); //Same as above
		addShortcut("tab",editor.indent) -> tab increases indent
		addShortcut("shift tab",editor.outdent) -> shift-tab decreases indent
		
		*/
		shortcut = shortcut.split(" ")
		var key = shortcut[shortcut.length-1]
		var controls = {
			alt:false
			,ctrl:false
			,shift:false			
		}
		for (var i = 0; i<shortcut.length-1; i++) {
			var control = shortcut[i]
			if (typeof controls[control] != "undefined") {
				controls[control] = true
			}			
		}
		if (shortcut.length == 1 && key.length == 1) { //make "b" = "ctrl b" but make "tab" != "ctrl tab" 
			controls.ctrl = true
		}
		this.shortcuts.push({key:key,controls:controls,action:action})
	}
	
	parseKeyEvent(key) {
		var keystring = key.key.toLowerCase()
		if (keystring != "control") {
			for (var i = 0; i<this.shortcuts.length; i++) {
				var shortcut = this.shortcuts[i]
				if (shortcut.key == keystring) {
					var controls = shortcut.controls
					var correct = (controls.alt == key.altKey) && (controls.shift == key.shiftKey) && (controls.ctrl == key.ctrlKey)
					if (correct) {
						console.log("Ran shortcut for "+(key.ctrlKey?"ctrl-":"")+(key.altKey?"alt-":"")+(key.shiftKey?"shift-":"")+keystring)
						key.stopPropagation();
						key.preventDefault();
						shortcut.action();
						return;
					}
				}
			}
		}
	}
	addStandardButtons() {
		this.addFaButton(this.bold,"basic","Bold","bold","b")
		
		this.addFaButton(this.italic,"basic","Italic","italic","i")
		this.addFaButton(this.underline,"basic","Underline","underline","u")
		this.addFaButton(this.strikethrough,"basic","Strikethrough","strikethrough")
		
		this.addFaButton(this.subscript,"subscripts","Subscript","subscript")
		this.addFaButton(this.superscript,"subscripts","Superscript","superscript")
		
		this.addFaButton(this.alignLeft,"align","Align Left","align-left")
		this.addFaButton(this.alignCenter,"align","Align Center","align-center")
		this.addFaButton(this.alignRight,"align","Align Right","align-right")
		
		this.addFaButton(this.list_ul,"list","Bulleted List","list-ul");
		this.addFaButton(this.list_ol,"list","Numbered List","list-ol");
		
		this.addFaButton(this.outdent,"indent","Decrease Indent","dedent","shift tab");
		this.addFaButton(this.indent,"indent","Increase Indent","indent","tab");
		
		this.addFaButton(this.convertToHTML,"html","Convert Selection to HTML","random")
		
		this.addFaButton(this.selectionToLink,"insert","Insert Link","link");
		this.addFaButton(this.insertImage,"insert","Insert Image","picture-o");
		
		this.addDropdownOption(this.h1,"Style","Heading 1")
		this.addDropdownOption(this.h2,"Style","Heading 2")
		this.addDropdownOption(this.h3,"Style","Heading 3")
		this.addDropdownOption(this.pre,"Style","Code (multiline)")
		this.addDropdownOption(this.code,"Style","Code (single line)")
	
		this.updateToolbar();
	}
	
	addDropdownOption(action,group,text) {
		var option = document.createElement("OPTION");
		option.innerHTML = text
		option["x-onselect"] = action.bind(this) //Is this a bad idea? Should we not be using custom attributes?
		var foundGroup = false
		for (var i = 0; i<this.dropdowns.length; i++) {
			var dropdown = this.dropdowns[i]
			if (dropdown.name == group) {
				foundGroup = true
				dropdown.options.push(option)
			}
		}
		
		if (!foundGroup) {
			this.dropdowns.push({name:group,options:[option]})
		}
	}
	
	updateToolbar() {
		this.toolbar.innerHTML = ""
		var dropdownToolbar = document.createElement("DIV")
		dropdownToolbar.className = "btn-toolbar"
		for (var i =0; i<this.dropdowns.length; i++) {
			var dropdown = this.dropdowns[i]
			var select = document.createElement("SELECT")
			var titleOption = document.createElement("OPTION")
			titleOption.innerHTML = dropdown.name
			select.appendChild(titleOption)
			for (var j = 0; j<dropdown.options.length; j++) {
				select.appendChild(dropdown.options[j])
			}
			select.onchange = function() { //Notice that this function is not bound; we want "this" to mean equal the select element.
				this[this.selectedIndex]["x-onselect"]();
				this.selectedIndex = 0
			}
			dropdownToolbar.appendChild(select)
		}
		this.toolbar.appendChild(dropdownToolbar);
		
		var buttonToolbar = document.createElement("DIV")
		buttonToolbar.className = "btn-toolbar"
		this.toolbar.appendChild(buttonToolbar)
		for (var i = 0; i<this.buttonGroups.length; i++) {
			var buttonGroup = this.buttonGroups[i]
			var div = document.createElement("DIV")
			div.className = "btn-group"
			div.role="group"
			buttonToolbar.appendChild(div)
			for (var j=0; j<buttonGroup.buttons.length; j++) {
				var button = buttonGroup.buttons[j]
				div.appendChild(button)
			}
		}
	}
	
	cmd(cmd,val) {
		document.execCommand(cmd, false, val); //Should there be extra code for taking care of when a page may have multiple editors?
	}
	
	bold() {
		this.cmd("bold")
	}
	
	italic() {
		this.cmd("italic")
	}
	
	underline() {
		this.cmd("underline")
	}
	
	strikethrough() {
		this.cmd("strikethrough")
	}
	
	alignRight() {
		this.cmd("justifyRight")
	}
	
	alignLeft() {
		this.cmd("justifyLeft")
	}
	
	alignCenter() {
		this.cmd("justifyCenter")
	}
	
	subscript() {
		this.cmd("subscript")
	}
	
	superscript() {
		this.cmd("superscript")
	}
	
	outdent() {
		this.cmd("outdent")
	}
	
	indent() {
		this.cmd("indent")
	}	
	
	list_ul() {
		this.cmd("insertUnorderedList")
	}
	
	list_ol() {
		this.cmd("insertOrderedList")
	}
	
	formatLine(block) {
		this.cmd("formatBlock",block)
	}
	
	wrapSelection(open,close) {
		this.cmd("insertHTML",open+this.selection+close)
	}
	
	h1() {
		this.formatLine("H1")
	}
	
	h2() {
		this.formatLine("H2")
	}
	
	h3() {
		this.formatLine("H3")
	}
	
	pre() {
		this.formatLine("PRE")
	}
	
	code() {
		this.wrapSelection("<code>","</code>")
	}
	
	clearFormatting() {
		this.cmd("removeFormat")
	}
	
	selectionToLink() {
		this.cmd("createLink",prompt("Link Location"));
	}
	
	insertImage() {
		Wiki.showModal("Insert Image","<input type='file' id='imageUpload' accept='image/*'></input>",function() {
			var selectedFile = document.getElementById('imageUpload').files[0];
			var reader = new FileReader();
			reader.onload = function(event) {
				this.cmd("insertImage",event.target.result)
			}.bind(this)
			reader.readAsDataURL(selectedFile)
		}.bind(this))
		
		
	}
	
	convertToHTML() {
		var html = this.selection
		html = html.replace(/&gt;/g,">");
		html = html.replace(/&lt;/g,"<");
		this.cmd("insertHTML",html)
	}
	
}