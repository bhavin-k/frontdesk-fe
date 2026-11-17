import {expect, it} from "vitest";
import {publicAuthResponse} from "@/lib/auth/public-response";

it("keeps the HttpOnly session cookie while stripping credentials from public JSON", async()=>{
  const response=await publicAuthResponse(Response.json({token:"private-server-session",user:{id:"user-1"},session:{id:"session-1",token:"private-server-session"},accounts:[{accessToken:"private-provider-token",provider:"example"}]},
    {headers:{"Set-Cookie":"recruitment-bt.session_token=private; HttpOnly; SameSite=Lax; Path=/"}}));
  expect(await response.json()).toEqual({user:{id:"user-1"},session:{id:"session-1"},accounts:[{provider:"example"}]});
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("preserves empty JSON-labelled OAuth redirects and their cookies", async () => {
  const response = await publicAuthResponse(new Response("", {
    status: 302,
    headers: {
      "Content-Type": "application/json",
      Location: "/dashboard",
      "Set-Cookie": "recruitment-bt.session_token=private; HttpOnly; SameSite=Lax; Path=/",
    },
  }));
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/dashboard");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).toBe("");
});
