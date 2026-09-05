const copy={
 'Piko Play アカウント':['Piko Play account','Piko Play 账户'],
 '学習きろくを保存しよう':['Save your learning progress','保存你的学习记录'],
 'ゲームはログインなしでも遊べます。Googleでログインすると、別の端末でも学習きろくを引き継げます。':['Play without logging in. Sign in with Google to use your learning record on another device.','无需登录也能游玩。通过Google登录后，可以在其他设备上继续使用学习记录。'],
 '安全チェック':['Security check','安全验证'],
 '安全チェックを準備しているよ…':['Preparing the security check…','正在准备安全验证…'],
 'Googleでログイン':['Sign in with Google','通过Google登录'],
 '今はログインしない':['Continue without logging in','暂不登录'],
 'ログイン時だけ、安全のために人間による操作かを確認します。ゲームを始めるための時間制限はありません。':['The security check is needed only for login. There is no deadline to start a game.','仅登录时需要安全验证。开始游戏没有等待时限。'],
 'もう少し待ってね。上の安全チェックが終わるとログインできます。':['Finish the security check above to sign in.','完成上方安全验证后即可登录。'],
 '安全チェックを用意できませんでした。管理者に知らせてください。':['The security check is unavailable. Please contact the site owner.','安全验证暂不可用，请联系网站管理员。'],
 '上の安全チェックを終えてね。':['Complete the security check above.','请完成上方安全验证。'],
 'ログインの準備ができたよ！':['Ready to sign in!','现在可以登录了！'],
 '時間がたったので、もう一度チェックしてね。':['The check expired. Please try again.','验证已过期，请重新验证。'],
 '安全チェックを開けませんでした。ページを読み直してみてね。':['Could not load the security check. Reload the page and try again.','无法加载安全验证，请刷新页面后重试。'],
 '安全チェックを開けませんでした。':['Could not load the security check.','无法加载安全验证。'],
 '新しい安全チェックを準備しているよ…':['Preparing a new security check…','正在准备新的安全验证…'],
 'いま使えるログイン方法はGoogleだけです。':['Google sign-in is currently available.','目前支持通过Google登录。'],
 'うまくログインできませんでした。もう一度ためしてみてね。':['Could not sign in. Please try again.','登录失败，请重试。'],
 '安全チェックの時間が切れました。もう一度チェックしてね。':['The security check expired. Please repeat it.','安全验证已过期，请重新完成验证。'],
 'ログインの準備をしています。少し待ってから、もう一度ためしてみてね。':['Sign-in is not ready. Please try again shortly.','登录服务暂未就绪，请稍后重试。'],
 'Googleログインを始められませんでした。もう一度ためしてみてね。':['Could not start Google sign-in. Please try again.','无法发起Google登录，请重试。']
};
export function authText(message,locale=document.documentElement.lang){
 const key=copy[message]?message:Object.keys(copy).find(k=>copy[k].includes(message));
 return key?(locale==='zh'?copy[key][1]:locale==='en'?copy[key][0]:key):message;
}
export function localizeAuth(element){
 const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){const value=node.textContent.trim();if(value)node.textContent=node.textContent.replace(value,authText(value));}
 element.querySelectorAll('[aria-label]').forEach(el=>el.setAttribute('aria-label',authText(el.getAttribute('aria-label'))));
}
