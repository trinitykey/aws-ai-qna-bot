NAME=$(shell basename $(shell pwd))
DST=../../build/lambda/$(NAME).zip
RESOURCES := $(shell  find . | grep -v node_modules | grep -v test )

$(DST): $(RESOURCES) 
	echo "Building $(NAME)"; cd lib && npm install && cd .. && zip -r -q $(DST) .
