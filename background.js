/*****************************************************************************************
This file is part of "Pesquisa de Jurisprudência".

"Pesquisa de Jurisprudência" is free software: you can redistribute it and/or 
modify it under the terms of the GNU General Public License as published by the 
Free Software Foundation, either version 3 of the License, or any later version.

"Pesquisa de Jurisprudência" is distributed in the hope that it will be useful, 
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or 
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with 
"Pesquisa de Jurisprudência".  If not, see <https://www.gnu.org/licenses/>.

Copyright 2022 Victor Wolf
*****************************************************************************************/

'use strict';

/***********
////MAIN////
***********/

// Initializing the Extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({slowMode: false, onWait: false, onExecution: false, waitEndTime: Date.UTC(0,0)});
});

// Reset options and modes to default on Startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({slowMode: false, onWait: false, onExecution: false, waitEndTime: Date.UTC(0,0)});
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'tab.html'
  });
});