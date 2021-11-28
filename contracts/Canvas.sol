pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Canvas is Ownable {

  mapping(uint256 => bytes32) rootHashByAge;

  uint256 public pixelsPerAge = 32;
  uint256 pixelsCounter;

	struct Pixel {
		uint256 x;
		uint256 y;
		uint256 color;
	}

	event PixelAdded(uint256 tokenId, uint256 x, uint256 y, uint256 color, uint256 age, bytes32 hash);

	function addPixel(Pixel[] memory newPixels, Pixel[] memory oldPixels) public payable onlyOwner {
    uint256 mergedLength = oldPixels.length + newPixels.length;
    require(mergedLength <= pixelsPerAge, 'Canvas: Out of age size');
    uint256 age = pixelsCounter / pixelsPerAge;
    pixelsCounter += newPixels.length;

    require(getRootHash(oldPixels) == rootHashByAge[age], 'Canvas: Roots do not match in AddPixel');
		Pixel[] memory mergedPixels = new Pixel[](mergedLength);

    for (uint256 i; i < oldPixels.length; i++) {
      mergedPixels[i] = oldPixels[i];
    }

    for (uint256 i; i < newPixels.length; i++) {
      mergedPixels[oldPixels.length + i] = newPixels[i];
    }

		bytes32 newHash = getRootHash(mergedPixels);
    rootHashByAge[age] = newHash;

    for (uint256 i; i < newPixels.length; i++) {
      emit PixelAdded(0, newPixels[i].x, newPixels[i].y, newPixels[i].color, age, newHash);
    }
	}

	function fillPixels(Pixel[] memory pixels) public pure returns(Pixel[] memory) {
		uint256 length = pixels.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		Pixel[] memory newPixels = new Pixel[](newLength);
		for (uint256 i; i < length; i++) {
			newPixels[i] = pixels[i];
		}
		return newPixels;
	}

	function getLeaves(Pixel[] memory pixels) internal pure returns(bytes32[] memory) {
		uint256 length = pixels.length;
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(i, pixels[i].x, pixels[i].y, pixels[i].color));
		}
		return leaves;
	}

	function getNodes(Pixel[] memory pixels) internal pure returns(bytes32[] memory) {
		bytes32[] memory leaves = getLeaves(pixels);
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

	function getRootHash(Pixel[] memory pixels) internal pure returns(bytes32) {
		if (pixels.length == 0) {
			return bytes32(0);
		}
		bytes32[] memory nodes = getNodes(fillPixels(pixels));
		return nodes[nodes.length - 1];
	}

	function verify(
		Pixel memory candidate,
		uint256 index,
		bytes32[] calldata proof
	) public view returns(bool) {
		bytes32 node = keccak256(abi.encodePacked(index, candidate.x, candidate.y, candidate.color));
		uint256 path = index;
		if (proof[0] != 0) {
			for (uint16 i = 0; i < proof.length; i++) {
				if ((path & 0x01) == 1) {
					node = keccak256(abi.encodePacked(proof[i], node));
				} else {
					node = keccak256(abi.encodePacked(node, proof[i]));
				}
				path /= 2;
			}
		}
    uint256 age = (pixelsCounter - 1) / pixelsPerAge;
    return node == rootHashByAge[age];
	}

  function getRootHashByAge(uint256 age) public view returns(bytes32) {
    return rootHashByAge[age];
  }
}
