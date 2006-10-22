/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Findbar Xtreme!
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var FBX = {

	browsers: {},
	
	init: function()
	{
		this._log("init");
		window.removeEventListener("load", this, false);
		window.addEventListener("unload", this, false);
    
    var browsers = gBrowser.browsers;
    for (var i=0; i<browsers.length; i++)
    {
    	this.addBrowser(browsers[i]);
    }
    
    gBrowser.tabContainer.addEventListener("TabOpen", this, false);
    gBrowser.tabContainer.addEventListener("TabClose", this, false);
    gBrowser.tabContainer.addEventListener("TabSelect", this, false);
	},
	
	destroy: function()
	{
		this._log("destroy");
		for (var i in this.browsers)
		{
			this.browsers[i].destroy();
		}
		this.browsers = [];
		
		window.removeEventListener("unload", this, false);
    gBrowser.tabContainer.removeEventListener("TabOpen", this, false);
    gBrowser.tabContainer.removeEventListener("TabClose", this, false);
    gBrowser.tabContainer.removeEventListener("TabSelect", this, false);
	},
	
	_log: function(message)
	{
		dump("FBX: "+message+"\n");
	},
	
	addBrowser: function(browser)
	{
		var handler = new FBX.BrowserHandler(browser);
		this.browsers[browser.parentNode.id] = handler;
	},
	
	removeBrowser: function(browser)
	{
		this.browsers[browser.parentNode.id].destroy();
		delete this.browsers[browser.parentNode.id];
	},
	
	selectBrowser: function(browser)
	{
	},
	
	handleEvent: function(event)
	{
		switch (event.type)
		{
			case "load":
				this.init();
				break;
			case "unload":
				this.destroy();
				break;
			case "TabOpen":
				this.addBrowser(event.target.linkedBrowser);
				break;
			case "TabClose":
				this.removeBrowser(event.target.linkedBrowser);
				break;
			case "TabSelect":
				this.selectBrowser(gBrowser.getBrowserForTab(gBrowser.selectedTab));
				break;
			default:
				dump("Unknown event "+event.type);
		}
	}
};

FBX.BrowserHandler = function(browser)
{
	this.browser = browser;
	this._log("init");
	browser.addProgressListener(this);
};

FBX.BrowserHandler.prototype = {
	browser: null,
	loading: false,
	textContent: "",
	nodeContent: [],
	
	_log: function(message)
	{
		dump("FBX "+this.browser.parentNode.id+": "+message+"\n");
	},
	
	destroy: function()
	{
		this._log("destroy");
		this.browser.removeProgressListener(this);
	},
	
	seekPosition: function(pos, start, end)
	{
		if (typeof(start) == "undefined")
			start = 0;
		if (typeof(end) == "undefined")
			end = this.nodeContent.length-1;
			
		if (start == end)
		{
			this._log("Found in "+start);
			return start;
		}

		var shift = pos-this.nodeContent[start].offset;
		var diff = this.nodeContent[end].offset-this.nodeContent[start].offset;
		var mid = parseInt((end-start)*(shift/diff))+start;

		this._log("Seeking "+start+" "+end+" "+mid);
		if (this.nodeContent[mid].offset>pos)
			return this.seekPosition(pos, start, mid-1);
		if ((this.nodeContent[mid].offset+this.nodeContent[mid].node.nodeValue.length)<=pos)
			return this.seekPosition(pos, mid+1, end);
		this._log("Found in "+mid);
		return mid;
	},
	
	test: function()
	{
		var time = Date.now();
		var seek = "onProgress: function";
		var pattern = new RegExp(seek);
		var result = pattern.exec(this.textContent);
		if (result)
		{
			this._log("Found at position "+result.index);

			var range = this.browser.contentDocument.createRange();

			var node = this.seekPosition(result.index);
			range.setStart(this.nodeContent[node].node, result.index-this.nodeContent[node].offset);
			node = this.seekPosition(result.index+result[0].length, node);
			range.setEnd(this.nodeContent[node].node, result.index+result[0].length-this.nodeContent[node].offset);

			var sel = this.browser.contentWindow.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
		else
			this._log("No result");
		time = Date.now()-time;
		this._log("Search complete in "+time+"ms.");
	},
	
	parseElement: function(element)
	{
		var node = element.firstChild;
		while (node)
		{
			if ((node.nodeType == Node.ELEMENT_NODE) && (node.firstChild))
			{
				node = node.firstChild;
				continue;
			}

			if (node.nodeType == Node.TEXT_NODE)
			{
				this.nodeContent[this.textContent.length] = node;
				this.textContent+=node.nodeValue;
			}

			while (!node.nextSibling)
			{
				node = node.parentNode;
				if (node == element)
					return;
			}
			node = node.nextSibling;
		}
	},
	
	parseDocument: function(doc)
	{
		var filter = function(node)
		{
			if (node.nodeType == Node.ELEMENT_NODE)
			{
				switch (node.localName)
				{
					case "script":
					case "style":
						return NodeFilter.FILTER_REJECT;
				}
			}
			return NodeFilter.FILTER_ACCEPT;
		}
		
		var walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT+NodeFilter.SHOW_ELEMENT, filter, true);
		var node = walker.firstChild();
		while (node)
		{
			if (node.nodeType == Node.TEXT_NODE)
			{
				this.nodeContent[this.nodeContent.length] = {
					offset: this.textContent.length,
					node: node
				};
				this.textContent += node.nodeValue;
			}
			node=walker.nextNode();
		}
	},
	
	parseContent: function()
	{
		this._log("Start parse");
		var time = Date.now();
		this.textContent = "";
		this.nodeContent = [];
		this.parseDocument(this.browser.contentDocument);
		time = Date.now()-time;
		this._log("Parse complete in "+time+"ms. Found "+this.textContent.length+" characters with "+this.nodeContent.length+" nodes.");
	},
	
	loadComplete: function()
	{
		this._log("Load complete");
		this.loading = false;
		//this.parseContent();
		//this.test();
	},
	
	loadStarted: function()
	{
		this._log("Load started");
		this.loading = true;
	},
	
	onProgressChange : function (aWebProgress, aRequest,
	                             aCurSelfProgress, aMaxSelfProgress,
	                             aCurTotalProgress, aMaxTotalProgress)
	{
	},
	
	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		var nsIWPL = Components.interfaces.nsIWebProgressListener;
		if (aStateFlags & nsIWPL.STATE_IS_NETWORK)
		{
		  if (aStateFlags & nsIWPL.STATE_STOP)
		  {
		    if (this.loading)
		      this.loadComplete();
		  }
		  else if (aStateFlags & nsIWPL.STATE_START)
		  {
		    if (!this.loading)
		      this.loadStarted();
		  }
		}
	},
	
	onLocationChange : function(aWebProgress, aRequest, aLocation)
	{
	},
	
	onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
	{
	},
	
	onSecurityChange : function(aWebProgress, aRequest, aState)
	{
	},
	
	QueryInterface : function(aIID)
	{
	  if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
	      aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
	      aIID.equals(Components.interfaces.nsISupports))
	    return this;
	  throw Components.results.NS_NOINTERFACE;
	}
};

window.addEventListener("load", FBX, false);
