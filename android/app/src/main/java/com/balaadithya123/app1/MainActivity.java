package com.balaadithya123.app1;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
  private final int ink = Color.rgb(24, 32, 42);
  private final int muted = Color.rgb(112, 122, 132);
  private final int orange = Color.rgb(242, 112, 72);
  private LinearLayout root, content, nav;
  private String current = "Home";

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(247,248,250));
    getWindow().setNavigationBarColor(Color.WHITE);
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
    root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(Color.rgb(247,248,250));
    setContentView(root);
    render();
  }

  private int dp(float v) { return (int)(v * getResources().getDisplayMetrics().density + .5f); }
  private GradientDrawable bg(int color, int radius) {
    GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
  }
  private TextView text(String s, int size, int color, boolean bold) {
    TextView t = new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(color);
    if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return t;
  }
  private LinearLayout column() { LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l; }
  private void pad(View v, int a, int b, int c, int d) { v.setPadding(dp(a),dp(b),dp(c),dp(d)); }
  private void render() {
    root.removeAllViews();
    LinearLayout header = new LinearLayout(this); header.setGravity(Gravity.CENTER_VERTICAL);
    header.setPadding(dp(20),dp(16),dp(20),dp(12));
    TextView logo = text("B", 25, Color.WHITE, true); logo.setGravity(Gravity.CENTER);
    logo.setBackground(bg(ink,13)); header.addView(logo,new LinearLayout.LayoutParams(dp(42),dp(42)));
    LinearLayout brand = column(); pad(brand,12,0,0,0);
    brand.addView(text("Builderco",20,ink,true));
    brand.addView(text("LOCAL SERVICES",10,muted,true)); header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
    TextView avatar=text("A",15,ink,true); avatar.setGravity(Gravity.CENTER); avatar.setBackground(bg(Color.WHITE,24));
    header.addView(avatar,new LinearLayout.LayoutParams(dp(40),dp(40)));
    root.addView(header);

    ScrollView scroll = new ScrollView(this); content = column(); pad(content,20,8,20,24);
    scroll.addView(content); root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
    if ("Home".equals(current)) home();
    else if ("Explore".equals(current)) explore();
    else if ("Bookings".equals(current)) bookings();
    else profile();
    nav = new LinearLayout(this); nav.setBackgroundColor(Color.WHITE); nav.setElevation(dp(10));
    String[] items={"Home","Explore","Bookings","Profile"};
    for (String item:items) {
      TextView b=text(icon(item)+"\n"+item,11,current.equals(item)?orange:muted,current.equals(item));
      b.setGravity(Gravity.CENTER); pad(b,0,10,0,10);
      nav.addView(b,new LinearLayout.LayoutParams(0,dp(62),1));
      b.setOnClickListener(v->{current=item;render();});
    }
    root.addView(nav);
  }
  private String icon(String s) { if(s.equals("Home"))return "⌂"; if(s.equals("Explore"))return "⌕"; if(s.equals("Bookings"))return "▣"; return "○"; }
  private void section(String title, String sub) {
    content.addView(text(title,25,ink,true));
    TextView d=text(sub,14,muted,false); pad(d,0,6,0,18); content.addView(d);
  }
  private void card(LinearLayout box) {
    box.setBackground(bg(Color.WHITE,18)); pad(box,16,16,16,16);
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2); p.bottomMargin=dp(14); content.addView(box,p);
  }
  private void home() {
    section("Find trusted help nearby","Book reliable local professionals in a few taps.");
    LinearLayout search=column(); search.setBackground(bg(Color.WHITE,14)); pad(search,16,15,16,15);
    search.addView(text("⌕   Search services or workers",15,muted,false)); card(search);
    LinearLayout hero=column(); hero.setBackground(bg(ink,20)); pad(hero,20,20,20,20);
    hero.addView(text("YOUR NEXT TASK,\nTAKEN CARE OF.",21,Color.WHITE,true));
    TextView desc=text("Discover skilled people around your neighbourhood.",13,Color.LTGRAY,false); pad(desc,0,9,0,16); hero.addView(desc);
    Button cta=new Button(this); cta.setText("Explore services"); cta.setTextColor(Color.WHITE); cta.setBackground(bg(orange,12));
    hero.addView(cta); cta.setOnClickListener(v->{current="Explore";render();}); card(hero);
    content.addView(text("Popular categories",18,ink,true)); pad(content.getChildAt(content.getChildCount()-1),0,4,0,12);
    String[] cats={"Home cleaning","Electrical","Plumbing","Painting"};
    for(String c:cats){ LinearLayout row=column(); row.addView(text(c,16,ink,true)); row.addView(text("Find available professionals  →",12,muted,false)); card(row); }
  }
  private void explore() {
    section("Explore services","Choose a category to find local professionals.");
    String[] cats={"Home cleaning","Plumbing","Electrical repairs","Painting","Appliance repair","Carpentry"};
    for(String c:cats){ LinearLayout r=column(); r.addView(text(c,17,ink,true)); r.addView(text("View professionals near you  →",13,muted,false)); card(r); }
  }
  private void bookings() {
    section("Your bookings","Keep track of your service requests.");
    LinearLayout b=column(); b.addView(text("No bookings yet",18,ink,true));
    b.addView(text("Your upcoming and completed services will appear here.",14,muted,false)); card(b);
    Button go=new Button(this); go.setText("Find a service"); go.setOnClickListener(v->{current="Explore";render();}); content.addView(go);
  }
  private void profile() {
    section("Your profile","Manage your Builderco account.");
    String[] opts={"Personal details","Saved addresses","Help & support","About Builderco"};
    for(String s:opts){LinearLayout r=column();r.addView(text(s,16,ink,true));card(r);}
  }
}
