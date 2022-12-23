
    import { AccountsClient } from "meteor/accounts-base";
    import { accountsDomain } from "../../../startup/both/index.js"
    import { Meteor } from 'meteor/meteor';
    import { app2, Accounts2 } from '/imports/startup/client';
    /*
    window.addEventListener('message', function (e) {
        const origin = accountsDomain;
        if (window.parent == window.top && window.parent.postMessage) {
         //  const app2 = DDP.connect(origin);
          //  const accounts2 = new AccountsClient({ connection: app2 });
            if (e.origin == origin) {
                if (e.data.msg == 'token') {
                    //Created a custom login method 'cross',
                    Accounts2.loginWithToken(e.data.token, (err, r) => {
                        if (err) {
                            console.log(err);
                        } else {
                           
                            Accounts.callLoginMethod({
                                methodArguments: [{ cross: Accounts2._storedLoginToken() }],
                                userCallback: function (er, re) {
                                    if (er) {
                                        console.log(er)
                                    } else {
                                        console.log(Accounts._storedLoginToken())
                                        console.log(e.data.token)
                                        e.source.postMessage('successlogin', e.origin);
                                    }
                                }
                            })
                        }
                    })
                }
            }
        }
    })
    */