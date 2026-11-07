package it.case247.andrea;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Intent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import java.util.ArrayList;
import java.util.Locale;
import org.json.JSONObject;

public final class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private WebView web;
    private TextToSpeech speech;
    private static final int VOICE_REQUEST=640;
    private static final int PERMISSIONS=641;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11,17,30));
        getWindow().setNavigationBarColor(Color.rgb(11,17,30));
        ReminderReceiver.channel(this);
        Scheduler.scheduleDaily(this);
        new AgendaStore(this).scheduleOutstanding(this);
        speech=new TextToSpeech(this,this);
        web=new WebView(this);
        web.setBackgroundColor(Color.rgb(11,17,30));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccessFromFileURLs(false);
        web.getSettings().setAllowUniversalAccessFromFileURLs(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new NativeBridge(),"Android");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,String url){return true;}
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        if(Build.VERSION.SDK_INT>=33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSIONS);
        incomingText(getIntent());
    }
    private void incomingText(Intent intent){
        if(intent==null)return;
        String action=intent.getAction();
        if(Intent.ACTION_SEND.equals(action)&&"text/plain".equals(intent.getType())){
            String content=intent.getStringExtra(Intent.EXTRA_TEXT);
            if(content!=null)web.postDelayed(()->web.evaluateJavascript(
                "window.onSharedText("+JSONObject.quote(content)+")",null),900);
        }
    }
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);incomingText(i);}
    @Override public void onInit(int status){
        if(status==TextToSpeech.SUCCESS && speech!=null)speech.setLanguage(Locale.ITALIAN);
    }
    @Override public void onRequestPermissionsResult(int code,String[] perms,int[] results){
        super.onRequestPermissionsResult(code,perms,results);
        web.postDelayed(()->web.evaluateJavascript("window.renderData&&window.renderData()",null),300);
    }
    @Override protected void onResume(){
        super.onResume();
        if(web!=null)web.postDelayed(()->web.evaluateJavascript("window.renderData&&window.renderData()",null),500);
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==VOICE_REQUEST && result==RESULT_OK && data!=null){
            ArrayList<String> texts=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if(texts!=null&&!texts.isEmpty()){
                web.evaluateJavascript("window.onSpeechResult("+JSONObject.quote(texts.get(0))+")",null);
            }
        }
    }
    @Override protected void onDestroy(){
        if(speech!=null){speech.stop();speech.shutdown();}
        if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}
        super.onDestroy();
    }
    private final class NativeBridge {
        @JavascriptInterface public String getSnapshot(){
            return new AgendaStore(MainActivity.this).snapshot(MainActivity.this).toString();
        }
        @JavascriptInterface public long addTask(String title,long due,String kind){
            if(title==null||title.trim().isEmpty()||title.length()>300)return -1;
            long id=new AgendaStore(MainActivity.this).addTask(title.trim(),due,kind);
            Scheduler.scheduleTask(MainActivity.this,id,due);
            return id;
        }
        @JavascriptInterface public void doneTask(long id,boolean done){
            new AgendaStore(MainActivity.this).markDone(id,done);
            if(done)Scheduler.cancelTask(MainActivity.this,id);
            else new AgendaStore(MainActivity.this).scheduleOutstanding(MainActivity.this);
        }
        @JavascriptInterface public void deleteTask(long id){
            new AgendaStore(MainActivity.this).removeTask(id);
            Scheduler.cancelTask(MainActivity.this,id);
        }
        @JavascriptInterface public void addSchool(int weekday,String title,String start,String end){
            if(weekday<1||weekday>7||title==null||title.trim().isEmpty())return;
            if(!start.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))return;
            if(!end.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))return;
            new AgendaStore(MainActivity.this).addSchool(weekday,title.trim(),start,end);
        }
        @JavascriptInterface public void deleteSchool(long id){
            new AgendaStore(MainActivity.this).removeSchool(id);
        }
        @JavascriptInterface public void setDigestTime(String kind,int hour,int minute){
            if(hour<0||hour>23||minute<0||minute>59)return;
            String prefix="evening".equals(kind)?"evening":"morning";
            getSharedPreferences("andrea",MODE_PRIVATE).edit()
                .putInt(prefix+"Hour",hour).putInt(prefix+"Minute",minute).apply();
            Scheduler.scheduleDaily(MainActivity.this);
        }
        @JavascriptInterface public void requestCalendar(){
            runOnUiThread(()->{
                if(checkSelfPermission(Manifest.permission.READ_CALENDAR)!=PackageManager.PERMISSION_GRANTED)
                    requestPermissions(new String[]{Manifest.permission.READ_CALENDAR},PERMISSIONS);
            });
        }
        @JavascriptInterface public void requestNotificationAccess(){
            runOnUiThread(()->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        }
        @JavascriptInterface public void requestExactAlarms(){
            runOnUiThread(()->{
                if(Build.VERSION.SDK_INT>=31){
                    AlarmManager a=(AlarmManager)getSystemService(Context.ALARM_SERVICE);
                    if(a!=null&&!a.canScheduleExactAlarms()){
                        Intent i=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        i.setData(android.net.Uri.parse("package:"+getPackageName()));
                        startActivity(i);
                    }
                }
            });
        }
        @JavascriptInterface public void recognize(){
            runOnUiThread(()->{
                try{
                    Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"it-IT");
                    i.putExtra(RecognizerIntent.EXTRA_PROMPT,"Dimmi cosa devo ricordarti");
                    startActivityForResult(i,VOICE_REQUEST);
                }catch(Exception e){
                    android.widget.Toast.makeText(MainActivity.this,"Riconoscimento vocale non disponibile",android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }
        @JavascriptInterface public void read(String content){
            if(content==null)return;
            final String safe=content.length()>3500?content.substring(0,3500):content;
            runOnUiThread(()->{
                if(speech!=null)speech.speak(safe,TextToSpeech.QUEUE_FLUSH,null,"andrea_read");
            });
        }
    }
}
