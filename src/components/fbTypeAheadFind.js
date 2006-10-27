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
 * The Original Code is /Find Bar/
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

const Ci = Components.interfaces;
const Cc = Components.classes;

#ifdef ${extension.debug}
function outputNode(node, offset)
{
	if (node.nodeType == Ci.nsIDOMNode.TEXT_NODE)
	{
		dump("text node "+node.nodeValue+" "+offset+"\n");
	}
	else if (node.nodeType == Ci.nsIDOMNode.ELEMENT_NODE)
	{
		dump("element node "+node.nodeName+" "+offset);
		if (offset<node.childNodes.length)
			dump(" "+node.childNodes[offset].nodeName+"\n");
		else
			dump(" (end)\n");
	}
	else
	{
		dump("unknown node "+node.nodeName+" "+offset+"\n");
	}
}
#endif

const FB_RANGEFIND = "{471f4944-1dd2-11b2-87ac-90be0a51d609}";

function FBRX_Find()
{
#ifdef ${extension.debug}
	dump("FBX_Find init\n");
#endif
/*	this.mPrefs = Cc["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefService)
                  .getBranch("extensions.findbarrx.").QueryInterface(Ci.nsIPrefBranch2);
	this.mRegularExpression = this.mPrefs.getBoolPref("regularExpression");
  this.mPrefs.addObserver("", this, false);*/
}

FBRX_Find.prototype = {

mRegularExpression: false,
mCaseSensitive: false,
mFindBackwards: false,
mWordBreaker: null,
//mPrefs: null,

get regularExpression() {
	return this.mRegularExpression;
},

set regularExpression(value) {
	this.mRegularExpression = value;
},

get caseSensitive() {
	return this.mCaseSensitive;
},

set caseSensitive(value) {
	this.mCaseSensitive = value;
},

get findBackwards() {
	return this.mFindBackwards;
},

set findBackwards(value) {
	this.mFindBackwards = value;
},

get wordBreaker() {
	return this.mWordBreaker;
},

set wordBreaker(value) {
	this.mWordBreaker = value;
},

Find: function(pattern, searchRange, startPoint, endPoint) {

	var range = searchRange.cloneRange();
	
	var prefs = Cc["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefService)
                  .getBranch("extensions.findbarrx.");
	this.mRegularExpression = prefs.getBoolPref("regularExpression");

#ifdef ${extension.debug}
	if (this.mFindBackwards)
		dump("Searching for "+pattern+" (backwards)\n");
	else
		dump("Searching for "+pattern+"\n");
		
	dump("searchRange start is ");
	outputNode(searchRange.startContainer, searchRange.startOffset);
	dump("searchRange end is ");
	outputNode(searchRange.endContainer, searchRange.endOffset);
	
#endif
	if (startPoint)
	{
#ifdef ${extension.debug}
		if (startPoint.collapsed)
		{
			dump("startPoint is ");
			outputNode(startPoint.startContainer, startPoint.startOffset);
		}
		else
		{
			dump("startPoint start is ");
			outputNode(startPoint.startContainer, startPoint.startOffset);
			dump("startPoint end is ");
			outputNode(startPoint.endContainer, startPoint.endOffset);
		}
		
#endif
		if (this.mFindBackwards)
			range.setEnd(startPoint.startContainer, startPoint.startOffset);
		else
			range.setStart(startPoint.endContainer, startPoint.endOffset);
	}
#ifdef ${extension.debug}
	else
		dump("startPoint is null\n");
#endif
	
	if (endPoint)
	{
#ifdef ${extension.debug}
		if (endPoint.collapsed)
		{
			dump("endPoint is ");
			outputNode(endPoint.startContainer, endPoint.startOffset);
		}
		else
		{
			dump("endPoint start is ");
			outputNode(endPoint.startContainer, endPoint.startOffset);
			dump("endPoint end is ");
			outputNode(endPoint.endContainer, endPoint.endOffset);
		}

#endif
		/*if (this.mFindBackwards)
			range.setStart(endPoint.startContainer, endPoint.startOffset);
		else
			range.setEnd(endPoint.endContainer, endPoint.endOffset);*/
	}
#ifdef ${extension.debug}
	else
		dump("endPoint is null\n");
#endif
	
	var te = Components.classes["@blueprintit.co.uk/textextractor;1"]
	                   .createInstance(Ci.fbITextExtractor);
	te.init(range.startContainer.ownerDocument, range);
	var text = te.textContent;
#ifdef ${extension.debug}
	dump("Found "+text.length+" characters to search\n");
	//dump(text+"\n\n");

#endif
	if (!this.mRegularExpression)
	{
		pattern = pattern.replace(/([\*\+\?\.\|\{\}\[\]\(\)\$\^\\])/g, "\\$1");
		pattern = pattern.replace(/ /g, "\\s+");
	}
	var flags = "m";
	if (!this.mCaseSensitive)
		flags+="i";
	if (this.mFindBackwards)
		flags+="g";
#ifdef ${extension.debug}
	dump("New pattern: /"+pattern+"/"+flags+"\n");
#endif
	
	try
	{
		var re = new RegExp(pattern, flags);
		re.ignoreCase = !this.mCaseSensitive;
		var results = re.exec(text);
		if (results)
		{
			var index = results.index;
			var length = results[0].length;
			if (this.mFindBackwards)
			{
				results = re.exec(text);
				while (results)
				{
					index = results.index;
					length = results[0].length;
					results = re.exec(text);
				}
			}
			
#ifdef ${extension.debug}
			dump("Found match at "+index+"\n");
#endif
			return te.getTextRange(index, length);
		}
#ifdef ${extension.debug}
		dump("No match found\n");
#endif
	}
	catch (e) { } // invalid regex
	
	return null;
},

observe: function (subject, topic, data)
{
	if (data=="regularExpression")
		this.mRegularExpression = this.mPrefs.getBoolPref(data);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsIFind)
   || iid.equals(Ci.nsISupports))
		return this;

	throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var initModule =
{
	ServiceCID: Components.ID("{4c77faaa-1ec3-46f8-bdda-25c5dd68b430}"),
	ServiceContractID: "@mozilla.org/embedcomp/rangefind;1",
	ServiceName: "Find Bar RX Range Find",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
	},

	getClassObject: function (compMgr, cid, iid)
	{
		if (!cid.equals(this.ServiceCID))
			throw Components.results.NS_ERROR_NO_INTERFACE
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return this.instanceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	instanceFactory:
	{
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			if (Components.classes["@blueprintit.co.uk/textextractor;1"])
			{
				var instance = new FBRX_Find();
				return instance.QueryInterface(iid);
			}
			else
			{
#ifdef ${extension.debug}
		dump("Falling back to standard find\n");
#endif
				return Components.classesByID[FB_RANGEFIND]
		                     .createInstance(iid);
		  }
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
