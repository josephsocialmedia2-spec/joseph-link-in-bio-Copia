package it.case247.andrea;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class MailListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(sbn==null)return;
        String pkg=sbn.getPackageName();
        if(!"com.google.android.gm".equals(pkg) &&
           !"com.samsung.android.email.provider".equals(pkg) &&
           !"com.microsoft.office.outlook".equals(pkg))return;
        Notification n=sbn.getNotification();
        if(n==null || n.extras==null)return;
        Bundle b=n.extras;
        String sender=String.valueOf(b.getCharSequence(Notification.EXTRA_TITLE,"")).trim();
        String preview=String.valueOf(b.getCharSequence(Notification.EXTRA_BIG_TEXT,
                b.getCharSequence(Notification.EXTRA_TEXT,""))).trim();
        String subject=preview;
        if(subject.length()>120)subject=subject.substring(0,120);
        if(sender.isEmpty()&&preview.isEmpty())return;
        if(preview.length()>1600)preview=preview.substring(0,1600);
        String key=sbn.getKey()+"-"+sbn.getPostTime()+"-"+preview.hashCode();
        new AgendaStore(this).addMail(key,sender,subject,preview,System.currentTimeMillis());
    }
}
