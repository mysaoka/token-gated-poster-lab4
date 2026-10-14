import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("PosterModule", (m) => {
    const poster = m.contract("Poster", ["0x0000000000000000000000000000000000000000", 0n]);
    const newOwner = m.getParameter("newOwner", m.getAccount(0));
    m.call(poster, "transferOwnership", [newOwner]);
    return { poster };
});
