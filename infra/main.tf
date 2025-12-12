terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# LocalStack-backed AWS provider for production-style practice.
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3   = "http://localhost:4566"
    sqs  = "http://localhost:4566"
    ec2  = "http://localhost:4566"
    iam  = "http://localhost:4566"
    sts  = "http://localhost:4566"
    kms  = "http://localhost:4566"
  }
}

########################################
# Network layer (simulated VPC in LocalStack)
########################################

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "recruitlens-vpc-local"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "recruitlens-public-a"
  }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "recruitlens-private-a"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "recruitlens-igw-local"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "recruitlens-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

########################################
# App security group (simulated)
########################################

resource "aws_security_group" "chatbot_api" {
  name        = "chatbot-api-sg"
  description = "Simulated SG for chatbot API"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chatbot-api-sg-local"
  }
}

########################################
# Storage + queue layer (S3 + SQS)
########################################

resource "aws_s3_bucket" "resumes" {
  bucket = "recruitlens-resumes"

  force_destroy = false

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    id      = "expire-old-resumes"
    enabled = true

    expiration {
      days = 365
    }
  }
}

resource "aws_sqs_queue" "resume_jobs_dlq" {
  name = "recruitlens-resume-jobs-dlq"
}

resource "aws_sqs_queue" "resume_jobs" {
  name = "recruitlens-resume-jobs"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.resume_jobs_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}