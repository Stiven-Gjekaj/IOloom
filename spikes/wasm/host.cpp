// Spike host: run the STruC++ program of the sample LD project as WebAssembly.
// The host owns the configuration and exports one scan and the I/O of the rung.
#include "generated.hpp"

using namespace strucpp;

static Configuration_CONFIG0 config;

extern "C" {

__attribute__((export_name("plc_scan"))) void plc_scan() { config.INSTANCE0.run(); }

__attribute__((export_name("set_motor"))) void set_motor(int value) { config.INSTANCE0.MOTOR = value != 0; }

__attribute__((export_name("get_lamp"))) int get_lamp() { return config.INSTANCE0.LAMP ? 1 : 0; }

}
