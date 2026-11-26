(* Traffic Light: a state machine with CASE steps red, red and yellow, green and yellow. A timer sets the time of each step. *)

PROGRAM main
  VAR
    red AT %QX0.0 : BOOL;
    yellow AT %QX0.1 : BOOL;
    green AT %QX0.2 : BOOL;
    step : INT := 0;
    step_timer : TON;
    step_time : TIME := T#5s;
  END_VAR

step_timer(IN := TRUE, PT := step_time);

IF step_timer.Q THEN
  step := step + 1;
  IF step > 3 THEN
    step := 0;
  END_IF;
  step_timer(IN := FALSE);
END_IF;

CASE step OF
  0:
    red := TRUE; yellow := FALSE; green := FALSE;
    step_time := T#5s;
  1:
    red := TRUE; yellow := TRUE; green := FALSE;
    step_time := T#1s;
  2:
    red := FALSE; yellow := FALSE; green := TRUE;
    step_time := T#5s;
  3:
    red := FALSE; yellow := TRUE; green := FALSE;
    step_time := T#2s;
END_CASE;

END_PROGRAM
