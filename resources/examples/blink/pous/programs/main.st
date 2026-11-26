(* Blink: a lamp on %QX0.0 turns on and off each half second. Two timers drive each other. *)

PROGRAM main
  VAR
    lamp AT %QX0.0 : BOOL;
    on_timer : TON;
    off_timer : TON;
  END_VAR

on_timer(IN := NOT off_timer.Q, PT := T#500ms);
off_timer(IN := on_timer.Q, PT := T#500ms);
lamp := on_timer.Q;

END_PROGRAM
