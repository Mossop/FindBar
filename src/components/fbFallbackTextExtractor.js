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

function fbNodeInfo()
{
}

fbNodeInfo.prototype = {
mDocumentOffset: null,
mNodeOffset: null,
mLength: null,
mNode: null
}

function FBRX_TextExtractor()
{
}

FBRX_TextExtractor.prototype = {

mTextContent: '',
mDocument: null,
mNodeContent: [],

get textContent() {
  if (!this.mDocument)
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  
  return this.mTextContent;
},
  
addTextNode: function(node, offset, length)
{
	var text;
	if (length)
		text = node.nodeValue.substring(offset, length);
	else
		text = node.nodeValue.substring(offset);

  nodeInfo = new fbNodeInfo();
  nodeInfo.mLength = text.length;

  if (nodeInfo.mLength > 0)
  {
    nodeInfo.mDocumentOffset = this.mTextContent.length;
    nodeInfo.mNodeOffset = offset;
    nodeInfo.mNode = node;

    this.mTextContent+=text;
    
    this.mNodeContent.push(nodeInfo);
  }
},

walkPastTree: function(current, limit)
{
  var next;

  do
  {
    if (current == limit) // Cannot move past our limit
      break;

    next = current.nextSibling;
    if (!next) // No siblings. Move out a step and try again.
    {
      current = current.parentNode;
      next = null;
    }

  } while ((!next) && (current)); // Until we find a node or run out of nodes.
  
  return next;
},

walkIntoTree: function(current, limit)
{
  var next;

  next = current.firstChild; // Attempt to recurse in
  if (!next)
    next = this.walkPastTree(current, limit);
  
  return next;
},

init: function(document, range) {
  if (!document)
    throw Components.results.NS_ERROR_INVALID_ARG;
    
  this.mDocument = null;
  this.mTextContent = '';
  
  var currentNode;
  var end;
  var startOffset = 0;
  var endOffset = 0;
  if (!range)
  {
  	if (document instanceof Ci.nsIDOMHTMLDocument)
      end = document.body;
    else
      end = document.documentElement;
    if (!end)
    {
      this.mDocument = document;
      return;
    }
    currentNode = end.firstChild;
    if (!currentNode)
    {
      this.mDocument = document;
      return NS_OK;
    }
  }
  else
  {
    var type;
    var children;

    end = range.endContainer;
    type = end.nodeType;
    endOffset = range.endOffset;

    if (type == Ci.nsIDOMNode.ELEMENT_NODE)
    {
      children = end.childNodes;
      end = children[endOffset-1];
    }

    currentNode = range.startContainer;
    type = currentNode.nodeType;
    startOffset = range.startOffset;
    
    if ((type == Ci.nsIDOMNode.ELEMENT_NODE) && (startOffset>0))
    {
      children = currentNode.childNodes;
      var length = children.length;
      if (startOffset<length)
        currentNode = children[startOffset];
      else if (length > 0)
      {
        currentNode = this.walkPastTree(currentNode, end);
      }
      startOffset = 0;
    }
  }

  var view;
  if (document instanceof Ci.nsIDOMDocumentView)
    view = document.defaultView.QueryInterface(Ci.nsIDOMViewCSS);
  
  while (currentNode)
  {
    var type = currentNode.nodeType;
    
    var nextNode;
    if ((type == Ci.nsIDOMNode.TEXT_NODE) || (type == Ci.nsIDOMNode.CDATA_SECTION_NODE))
    {
      if (currentNode != end)
        this.addTextNode(currentNode, startOffset);
      else
        this.addTextNode(currentNode, startOffset, endOffset);
      nextNode = this.walkPastTree(currentNode, end);
      currentNode = nextNode;
      startOffset = 0;
      continue;
    }
    
    startOffset = 0;
    if (type == Ci.nsIDOMNode.ELEMENT_NODE)
    {
      if (view)
      {
      	var style = view.getComputedStyle(currentNode, '');
        var display = style.getPropertyValue("display");
        if (display=="none")
        {
          nextNode = this.walkPastTree(currentNode, end);
          currentNode = nextNode;
          continue;
        }
      }
    }
    
    nextNode = this.walkIntoTree(currentNode, end);
    currentNode = nextNode;
  }
  this.mDocument = document;
},
	
seekOffsetPosition: function(offset, start, end)
{
  if (end <= (start+1))
    return start;
  
  var diff = this.mNodeContent[end].mDocumentOffset-this.mNodeContent[start].mDocumentOffset;
  var offs = offset-this.mNodeContent[start].mDocumentOffset;
  var mid = Math.floor(start+(offs/(diff*1.0/(end-start))));
  
  if (this.mNodeContent[mid].mDocumentOffset > offset)
    return this.seekOffsetPosition(offset, start, mid);
  if ((this.mNodeContent[mid].mDocumentOffset+this.mNodeContent[mid].mLength) <= offset)
    return this.seekOffsetPosition(offset, mid+1, end);
  return mid;
},

getOffsetPosition: function(offset, start)
{
  var end = this.mNodeContent.length-1;
  if (this.mNodeContent[end].mDocumentOffset <= offset)
    return end;
  return this.seekOffsetPosition(offset, start, end);
},

getTextRange: function(offset, length) {
  if (!this.mDocument)
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  
  var range = this.mDocument.createRange();

  var pos = this.getOffsetPosition(offset, 0);
  range.setStart(this.mNodeContent[pos].mNode, offset-this.mNodeContent[pos].mDocumentOffset+this.mNodeContent[pos].mNodeOffset);
  
  pos = this.getOffsetPosition(offset+length, pos);
  range.setEnd(this.mNodeContent[pos].mNode, offset+length-this.mNodeContent[pos].mDocumentOffset+this.mNodeContent[pos].mNodeOffset);
  
  return range;
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.fbITextExtractor)
   || iid.equals(Ci.nsISupports))
		return this;

	throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var initModule =
{
	ServiceCID: Components.ID("{a5089a1b-2afe-4dae-94b4-c051c3cde90a}"),
	ServiceContractID: "@blueprintit.co.uk/fallbacktextextractor;1",
	ServiceName: "Find Bar RX Text Extractor",
	
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
		if (!iid.equals(Ci.nsIFactory))
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
			var instance = new FBRX_TextExtractor();
			return instance.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
