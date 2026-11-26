(* Tank Level: a pump fills the tank when the level on %IW0 falls below 30 percent, and stops above 80 percent. A function block holds the hysteresis. *)

PROGRAM main
  VAR
    level_raw AT %IW0 : INT;
    pump AT %QX0.0 : BOOL;
    level_percent : INT;
    fill_control : FB_Hysteresis;
  END_VAR

level_percent := level_raw / 655;
fill_control(value := level_percent, low := 30, high := 80);
pump := fill_control.active;

END_PROGRAM
