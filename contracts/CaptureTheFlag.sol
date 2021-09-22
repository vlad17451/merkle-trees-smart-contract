import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract CaptureTheFlag is Ownable {

	bytes32 public whiteListRootHash;

	address public currentFlagHolder;

	function setWhiteListRootHash(bytes32 hash) public payable onlyOwner {
		whiteListRootHash = hash;
	}
	
	function fillAddresses(address[] memory addresses) public view returns(address[] memory) {
		uint256 length = addresses.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		address[] memory newAddresses = new address[](newLength);
		for (uint256 i; i < length; i++) {
			newAddresses[i] = addresses[i];
		}
		return newAddresses;
	}
	
	function sortAddresses (address [] memory addresses) public pure returns (address[] memory) {
		for (uint256 i = addresses.length - 1; i > 0; i--) {
			for (uint256 j = 0; j < i; j++) {
				if (addresses [i] < addresses [j]) {
					(addresses [i], addresses [j]) = (addresses [j], addresses [i]);
				}
			}
		}
		return addresses;
	}
	
	function getLeaves(address[] memory addresses) public view returns(bytes32[] memory) {
		uint256 length = addresses.length;
		addresses = sortAddresses(addresses);
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(i, addresses[i]));
		}
		return leaves;
	}
	
	function getNodes(address[] memory addresses) public view returns(bytes32[] memory) {
		bytes32[] memory leaves = getLeaves(addresses);
		uint256 length = leaves.length;
		uint256 nodeCount = (length * 2) - 1;
		bytes32[] memory nodes = new bytes32[](nodeCount);
		for (uint256 i = 0; i < leaves.length; i++) {
			nodes[i] = leaves[i];
		}
		uint256 path = length;
		uint256 offset = 0;
		uint256 iteration = length;
		while (path > 0) {
			for (uint256 i = 0; i < path - 1; i += 2) {
				nodes[iteration] = keccak256(
					abi.encodePacked(nodes[offset + i], nodes[offset + i + 1])
				);
				iteration++;
			}
			offset += path;
			path /= 2;
		}
		return nodes;
	}
	
	function getRootHash(address[] memory addresses) public view returns(bytes32) {
		bytes32[] memory nodes = getNodes(fillAddresses(addresses));
		return nodes[nodes.length - 1];
	}
	
	function sqrt(uint256 x) internal pure returns (uint256 y) {
		uint256 z = (x + 1) / 2;
		y = x;
		while (z < y) {
			y = z;
			z = (x / z + z) / 2;
		}
	}
	
	function getProof(address candidate, address[] memory addresses) public view returns(bytes32[] memory proof, uint256 index) {
		address[] memory filledAddresses = fillAddresses(addresses);
		proof = new bytes32[](sqrt(filledAddresses.length));
		bytes32[] memory nodes = getNodes(filledAddresses);
		bytes32[] memory leaves = getLeaves(filledAddresses);
		filledAddresses = sortAddresses(filledAddresses);
		for (uint256 i; i < filledAddresses.length; i++) {
			if (filledAddresses[i] == candidate) {
				index = i;
				break;
			}
		}
		uint256 path = index;
		uint256 layer = filledAddresses.length;
		uint256 offset = 0;
		uint256 iteration = 0;
		while (layer > 1) {
			bytes32 node;
			if ((path & 0x01) == 1) {
				node = nodes[offset + path - 1];
			} else {
				node = nodes[offset + path + 1];
			}
			proof[iteration] = node;
			iteration++;
			offset += layer;
			layer /= 2;
			path /= 2;
		}
	}

	function capture(uint256 index, bytes32[] calldata proof) public payable {
		bytes32 node = keccak256(abi.encodePacked(index, msg.sender));
		uint256 path = index;
		for (uint16 i = 0; i < proof.length; i++) {
			if ((path & 0x01) == 1) {
				node = keccak256(abi.encodePacked(proof[i], node));
			} else {
				node = keccak256(abi.encodePacked(node, proof[i]));
			}
			path /= 2;
		}
		require(node == whiteListRootHash, 'CaptureTheFlag: Invalid proof');
		currentFlagHolder = msg.sender;
	}
}
