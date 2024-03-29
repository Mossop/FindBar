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

#ifndef _fbTextExtractor_h_
#define _fbTextExtractor_h_

#include "fbITextExtractor.h"
#include "nsEmbedString.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"

#define TEXTEXTRACTOR_CONTRACTID "@blueprintit.co.uk/textextractor;1"
#define TEXTEXTRACTOR_CLASSNAME "Find Bar RX Text Extractor"
#define TEXTEXTRACTOR_CID { 0xefa4ebba, 0x1002, 0x4a89, {0x88, 0x94, 0x54, 0x46, 0x9a, 0x9d, 0x99, 0x13} }

class fbNodeInfo
{
public:
  PRInt32 mDocumentOffset;
  PRInt32 mNodeOffset;
  PRInt32 mLength;
  nsCOMPtr<nsIDOMNode> mNode;
};

class fbTextExtractor : public fbITextExtractor
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_FBITEXTEXTRACTOR

  fbTextExtractor();

private:
  ~fbTextExtractor();
  nsString mTextContent;
  nsCOMPtr<nsIDOMDocument> mDocument;
  nsTArray<fbNodeInfo> mNodeContent;

  void AddTextNode(nsIDOMNode *node, PRInt32 offset);
  void AddTextNode(nsIDOMNode *node, PRInt32 offset, PRInt32 length);
  void WalkPastTree(nsIDOMNode *current, nsIDOMNode *limit, nsIDOMNode **retval);
  void WalkIntoTree(nsIDOMNode *current, nsIDOMNode *limit, nsIDOMNode **retval);
  PRUint32 GetOffsetPosition(PRInt32 offset, PRInt32 start, PRInt32 end);
  PRUint32 GetOffsetPosition(PRInt32 offset, PRInt32 start);

protected:
};

#endif
