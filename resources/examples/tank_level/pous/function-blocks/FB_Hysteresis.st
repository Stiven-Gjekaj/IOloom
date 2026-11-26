(* Turns the output on below the low limit and off above the high limit. Between the limits it keeps its state. *)

FUNCTION_BLOCK FB_Hysteresis
  VAR_INPUT
    value : INT;
    low : INT;
    high : INT;
  END_VAR
  VAR_OUTPUT
    active : BOOL;
  END_VAR

IF value < low THEN
  active := TRUE;
ELSIF value > high THEN
  active := FALSE;
END_IF;

END_FUNCTION_BLOCK
