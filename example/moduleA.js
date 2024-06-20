import { functionB } from "./moduleB";
import { functionC } from "./more-modules/moduleC";

export function functionA() {
  console.log("Function A is running...");
  functionB();
  functionC();
}
