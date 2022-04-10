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

class searchController {
  static cleanForNextRun() {
    requestsCompleted = 0;
    requestsParsed = 0;
    errorCount = 0;
    searchQueryInput.value = '';
    chrome.storage.local.set({onExecution: false});       
  }

  static setWaitForNextRun(message) {
    chrome.storage.local.set({onWait: true}, () => {
      let waitTimeInMinutes = 1;
      chrome.alarms.create("WaitForNextRun", { delayInMinutes: waitTimeInMinutes });

      if (message) {
        tabHelper.setWaitingScreenWithWaitTimeAndMessage(waitTimeInMinutes * 60, message);
      } else {
        tabHelper.setWaitingScreenWithWaitTime(waitTimeInMinutes * 60);
      }

      // Bug fix #2: sets a datetime to confirm wait mode
      chrome.storage.local.set({waitEndTime: Date.now() + waitTimeInMinutes * 60 * 1000 }); 
    });
  }
}