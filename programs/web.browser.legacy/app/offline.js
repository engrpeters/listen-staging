/* eslint-disable */
// Source: https://dzone.com/articles/introduction-to-progressive-web-apps-offline-first

 
    document.addEventListener('DOMContentLoaded', function(event) {
      // On initial load to check connectivity
      if (!navigator.onLine) {
        updateNetworkStatus();
      }
      window.addEventListener('online', updateNetworkStatus, false);
      window.addEventListener('offline', updateNetworkStatus, false);
    });
  
    // To update network status
    function updateNetworkStatus() {
      if (navigator.onLine) {

  toastr.clear()
   toastr.info('Online')
      }
      else {
 
    toastr.warning('Offline','',{timeOut:0})
 
      }
    }
    
    if(matchMedia('(display-mode:standalone)').matches){
      isPWAinBroswer = false;
    }else{
      isPWAinBroswer = !navigator.standalone
    }
  