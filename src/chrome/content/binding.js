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

var FBRX = {
  mPrefs: null,
  
  init: function()
  {
    window.removeEventListener("load", this, false);

    this.mPrefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch("extensions.findbarrx.")
                    .QueryInterface(Ci.nsIPrefBranch2);
    this.updateUI(this.mPrefs.getBoolPref("regularExpression"));
    this.mPrefs.addObserver("", this, false);
      
    window.addEventListener("unload", this, false);
  },
  
  destroy: function()
  {
    window.removeEventListener("unload", this, false);
    this.mPrefs.removeObserver("", this);
  },
  
  updateUI: function(regex)
  {
    var bars = document.getElementsByTagName("findbar");
    for (var i=0; i<bars.length; i++)
    {
      var checkbox = document.getAnonymousElementByAttribute(bars[i], "anonid", "find-regular-expression");
      var label = document.getAnonymousElementByAttribute(bars[i], "anonid", "match-regular-expression");
      checkbox.checked = regex;
      if (regex)
      {
        var bundle = document.getElementById("bundle_findBarRX");
        label.value = bundle.getString("findbarrx.regex.label");
      }
      else
        label.value = "";
    }
  },
  
  observe: function (subject, topic, data)
  {
    if (data=="regularExpression")
      this.updateUI(this.mPrefs.getBoolPref(data));
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
    }
  }
};

window.addEventListener("load", FBRX, false);
