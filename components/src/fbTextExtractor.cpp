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
 * The Original Code is Nightly Tester Tools.
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

#include "fbTextExtractor.h"
#include "nsIDOMHTMLDocument.h"
#include "nsIDOMHTMLElement.h"
#include "nsIDOMElement.h"
#include "nsIDOMDocumentTraversal.h"
#include "nsIDOMDocumentRange.h"
#include "nsIDOMTreeWalker.h"
#include "nsIDOMNodeFilter.h"
#include <stdio.h>

NS_IMPL_ISUPPORTS2(fbTextExtractor,
                   fbITextExtractor,
                   nsIDOMNodeFilter)

fbTextExtractor::fbTextExtractor()
{
  /* member initializers and constructor code */
}

fbTextExtractor::~fbTextExtractor()
{
  /* destructor code */
}

/* readonly attribute ACString textContent; */
NS_IMETHODIMP fbTextExtractor::GetTextContent(nsAString & aTextContent)
{
  if (!mDocument)
    return NS_ERROR_NOT_INITIALIZED;
  
  aTextContent = mTextContent;

  return NS_OK;
}

/* short acceptNode (in nsIDOMNode n); */
NS_IMETHODIMP fbTextExtractor::AcceptNode(nsIDOMNode *aNode, PRInt16 *retval)
{
  *retval = nsIDOMNodeFilter::FILTER_ACCEPT;

  PRUint16 type;
  aNode->GetNodeType(&type);
  if (type == nsIDOMNode::ELEMENT_NODE)
  {
    nsAutoString name;
    aNode->GetLocalName(name);
    if (name.EqualsLiteral("script") || name.EqualsLiteral("style"))
      *retval = nsIDOMNodeFilter::FILTER_REJECT;
  }
  
  return NS_OK;
}

/* void init (in nsIDOMDocument document); */
NS_IMETHODIMP fbTextExtractor::Init(nsIDOMDocument *aDoc)
{
  if (!aDoc)
    return NS_ERROR_INVALID_ARG;
    
	nsresult rv;
	
	mDocument = nsnull;
	mTextContent.Truncate();
	
	nsCOMPtr<nsIDOMElement> root;
  nsCOMPtr<nsIDOMHTMLDocument> htmlDoc = do_QueryInterface(aDoc, &rv);
  if (NS_SUCCEEDED(rv))
  {
  	nsCOMPtr<nsIDOMHTMLElement> htmlRoot;
  	htmlDoc->GetBody(getter_AddRefs(htmlRoot));
    root = do_QueryInterface(htmlRoot, &rv);
    if (NS_FAILED(rv)) return rv;
  }
  else
  {
  	aDoc->GetDocumentElement(getter_AddRefs(root));
  }
  
	nsCOMPtr<nsIDOMDocumentTraversal> trav = do_QueryInterface(aDoc, &rv);
	if (NS_FAILED(rv)) return rv;

	nsCOMPtr<nsIDOMTreeWalker> walker;
	rv = trav->CreateTreeWalker(root, 
                              nsIDOMNodeFilter::SHOW_TEXT | nsIDOMNodeFilter::SHOW_ELEMENT,
                              this, PR_TRUE, getter_AddRefs(walker));
  if (NS_FAILED(rv)) return rv;
  
  nsCOMPtr<nsIDOMNode> currentNode;
  walker->GetCurrentNode(getter_AddRefs(currentNode));
  while (currentNode)
  {
    PRUint16 type;
    currentNode->GetNodeType(&type);
    if (type == nsIDOMNode::TEXT_NODE)
    {
      fbNodeInfo nodeInfo;
      nodeInfo.mDocumentOffset = mTextContent.Length();
      nodeInfo.mNodeOffset = 0;
      nodeInfo.mNode = currentNode;
      
      nsAutoString text;
      currentNode->GetNodeValue(text);
      mTextContent.Append(text);
      nodeInfo.mLength = text.Length();
      
      mNodeContent.AppendElement(nodeInfo);
    }
  	walker->NextNode(getter_AddRefs(currentNode));
  }
  mDocument = aDoc;
  
	return NS_OK;
}

PRUint32 fbTextExtractor::GetOffsetPosition(PRInt32 offset, PRInt32 start, PRInt32 end)
{
  if (end <= (start+1))
    return start;
  
  PRInt32 diff = mNodeContent[end].mDocumentOffset-mNodeContent[start].mDocumentOffset;
  PRInt32 offs = offset-mNodeContent[start].mDocumentOffset;
  PRInt32 mid = start+(PRInt32)(offs/(diff*1.0/(end-start)));
  
  if (mNodeContent[mid].mDocumentOffset > offset)
    return GetOffsetPosition(offset, start, mid);
  if ((mNodeContent[mid].mDocumentOffset+mNodeContent[mid].mLength) <= offset)
    return GetOffsetPosition(offset, mid+1, end);
  return mid;
}

PRUint32 fbTextExtractor::GetOffsetPosition(PRInt32 offset, PRInt32 start)
{
  PRInt32 end = mNodeContent.Length()-1;
  if (mNodeContent[end].mDocumentOffset <= offset)
    return end;
  return GetOffsetPosition(offset, start, end);
}

/* nsIDOMRange getTextRange (in long offset, in long length); */
NS_IMETHODIMP fbTextExtractor::GetTextRange(PRInt32 offset, PRInt32 length, nsIDOMRange **retval)
{
  if (!mDocument)
    return NS_ERROR_NOT_INITIALIZED;
  
	nsresult rv;
	
	nsCOMPtr<nsIDOMDocumentRange> docrange = do_QueryInterface(mDocument, &rv);
	if (NS_FAILED(rv)) return rv;

	nsCOMPtr<nsIDOMRange> range;
  rv = docrange->CreateRange(getter_AddRefs(range));
  if (NS_FAILED(rv)) return rv;

  PRUint32 pos = GetOffsetPosition(offset, 0);
  rv = range->SetStart(mNodeContent[pos].mNode, offset-mNodeContent[pos].mDocumentOffset+mNodeContent[pos].mNodeOffset);
  if (NS_FAILED(rv)) return rv;
  
  pos = GetOffsetPosition(offset+length, pos);
  rv = range->SetEnd(mNodeContent[pos].mNode, offset+length-mNodeContent[pos].mDocumentOffset+mNodeContent[pos].mNodeOffset);
  if (NS_FAILED(rv)) return rv;
  
  NS_ADDREF(*retval = range);
  
  return NS_OK;
}
