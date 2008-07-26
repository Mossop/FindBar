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
 *      Dave Townsend <dtownsend@oxymoronical.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2008
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
 */

#include "fbTextExtractor.h"
#include "nsIDOMHTMLDocument.h"
#include "nsIDOMHTMLElement.h"
#include "nsIDOMElement.h"
#include "nsIDOMNodeList.h"
#include "nsIDOMDocumentRange.h"
#include "nsIDOMDocumentView.h"
#include "nsIDOMAbstractView.h"
#include "nsIDOMViewCSS.h"
#include "nsIDOMCSSStyleDeclaration.h"

NS_IMPL_ISUPPORTS1(fbTextExtractor,
                   fbITextExtractor)

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

void fbTextExtractor::AddTextNode(nsIDOMNode *node, PRInt32 offset)
{
  nsEmbedString text;
  node->GetNodeValue(text);
  NS_StringCutData(text, 0, offset);
  fbNodeInfo nodeInfo;
  nodeInfo.mLength = text.Length();

  if (nodeInfo.mLength > 0)
  {
    nodeInfo.mDocumentOffset = mTextContent.Length();
    nodeInfo.mNodeOffset = offset;
    nodeInfo.mNode = node;

    mTextContent.Append(text);

    mNodeContent.AppendElement(nodeInfo);
  }
}

void fbTextExtractor::AddTextNode(nsIDOMNode *node, PRInt32 offset, PRInt32 length)
{
  nsEmbedString text;
  node->GetNodeValue(text);
  NS_StringCutData(text, 0, offset);
  text.SetLength(length);
  fbNodeInfo nodeInfo;
  nodeInfo.mLength = text.Length();

  if (nodeInfo.mLength > 0)
  {
    nodeInfo.mDocumentOffset = mTextContent.Length();
    nodeInfo.mNodeOffset = offset;
    nodeInfo.mNode = node;

    mTextContent.Append(text);

    mNodeContent.AppendElement(nodeInfo);
  }
}

void fbTextExtractor::WalkPastTree(nsIDOMNode *current, nsIDOMNode *limit, nsIDOMNode **retval)
{
  nsCOMPtr<nsIDOMNode> next;

  do
  {
    if (current == limit) // Cannot move past our limit
      break;

    current->GetNextSibling(getter_AddRefs(next));
    if (!next) // No siblings. Move out a step and try again.
    {
      current->GetParentNode(getter_AddRefs(next));
      current = next;
      next = nsnull;
    }

  } while ((!next) && (current)); // Until we find a node or run out of nodes.

  NS_ASSERTION(current, "Ran out of nodes before hitting limit");

  NS_IF_ADDREF(*retval = next);
}

void fbTextExtractor::WalkIntoTree(nsIDOMNode *current, nsIDOMNode *limit, nsIDOMNode **retval)
{
  nsCOMPtr<nsIDOMNode> next;

  current->GetFirstChild(getter_AddRefs(next)); // Attempt to recurse in
  if (!next)
    WalkPastTree(current, limit, getter_AddRefs(next));

  NS_IF_ADDREF(*retval = next);
}

/* void init (in nsIDOMDocument document); */
NS_IMETHODIMP fbTextExtractor::Init(nsIDOMDocument *aDoc, nsIDOMRange *aRange)
{
  if (!aDoc)
    return NS_ERROR_INVALID_ARG;

  nsresult rv;

  mDocument = nsnull;
  mTextContent = EmptyString();

  nsCOMPtr<nsIDOMNode> currentNode;
  nsCOMPtr<nsIDOMNode> end;
  PRInt32 startOffset = 0;
  PRInt32 endOffset = 0;
  if (!aRange)
  {
    nsCOMPtr<nsIDOMHTMLDocument> htmlDoc = do_QueryInterface(aDoc, &rv);
    if (NS_SUCCEEDED(rv))
    {
      nsCOMPtr<nsIDOMHTMLElement> eleRoot;
      rv = htmlDoc->GetBody(getter_AddRefs(eleRoot));
      if (NS_FAILED(rv)) return rv;
      end = do_QueryInterface(eleRoot, &rv);
      if (NS_FAILED(rv)) return rv;
    }
    else
    {
      nsCOMPtr<nsIDOMElement> eleRoot;
      rv = aDoc->GetDocumentElement(getter_AddRefs(eleRoot));
      if (NS_FAILED(rv)) return rv;
      end = do_QueryInterface(eleRoot, &rv);
      if (NS_FAILED(rv)) return rv;
    }
    if (!end)
    {
      mDocument = aDoc;
      return NS_OK;
    }
    end->GetFirstChild(getter_AddRefs(currentNode));
    if (!currentNode)
    {
      mDocument = aDoc;
      return NS_OK;
    }
  }
  else
  {
    PRUint16 type;
    nsCOMPtr<nsIDOMNodeList> children;

    aRange->GetEndContainer(getter_AddRefs(end));
    end->GetNodeType(&type);
    aRange->GetEndOffset(&endOffset);

    if (type == nsIDOMNode::ELEMENT_NODE)
    {
      end->GetChildNodes(getter_AddRefs(children));
      children->Item(endOffset-1, getter_AddRefs(end));
    }

    aRange->GetStartContainer(getter_AddRefs(currentNode));
    currentNode->GetNodeType(&type);
    aRange->GetStartOffset(&startOffset);

    if ((type == nsIDOMNode::ELEMENT_NODE) && (startOffset>0))
    {
      currentNode->GetChildNodes(getter_AddRefs(children));
      PRUint32 length;
      children->GetLength(&length);
      if (startOffset<(PRInt32)length)
        children->Item(startOffset, getter_AddRefs(currentNode));
      else if (length > 0)
      {
        nsCOMPtr<nsIDOMNode> nextNode;
        WalkPastTree(currentNode, end, getter_AddRefs(nextNode));
        currentNode = nextNode;
      }
      startOffset = 0;
    }
  }

  nsCOMPtr<nsIDOMViewCSS> view;
  nsCOMPtr<nsIDOMDocumentView> docView = do_QueryInterface(aDoc, &rv);
  if (NS_SUCCEEDED(rv))
  {
    nsCOMPtr<nsIDOMAbstractView> absView;
    rv = docView->GetDefaultView(getter_AddRefs(absView));
    if (NS_SUCCEEDED(rv))
      view = do_QueryInterface(view, &rv);
  }

  while (currentNode)
  {
    PRUint16 type;
    currentNode->GetNodeType(&type);

    nsCOMPtr<nsIDOMNode> nextNode;
    if ((type == nsIDOMNode::TEXT_NODE) || (type == nsIDOMNode::CDATA_SECTION_NODE))
    {
      if (currentNode != end)
        AddTextNode(currentNode, startOffset);
      else
        AddTextNode(currentNode, startOffset, endOffset);
      WalkPastTree(currentNode, end, getter_AddRefs(nextNode));
      currentNode = nextNode;
      startOffset = 0;
      continue;
    }

    startOffset = 0;
    if (type == nsIDOMNode::ELEMENT_NODE)
    {
      if (view)
      {
        nsCOMPtr<nsIDOMElement> element = do_QueryInterface(currentNode, &rv);
        nsCOMPtr<nsIDOMCSSStyleDeclaration> style;
        rv = view->GetComputedStyle(element, EmptyString(), getter_AddRefs(style));
        if (NS_SUCCEEDED(rv))
        {
          nsEmbedString display;
          style->GetPropertyValue(NS_LITERAL_STRING("display"), display);
          if (display.Equals(NS_LITERAL_STRING("none")))
          {
            WalkPastTree(currentNode, end, getter_AddRefs(nextNode));
            currentNode = nextNode;
            continue;
          }
        }
      }
    }

    WalkIntoTree(currentNode, end, getter_AddRefs(nextNode));
    currentNode = nextNode;
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
